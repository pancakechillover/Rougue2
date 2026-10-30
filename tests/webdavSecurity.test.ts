import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isForbiddenHost,
  validateWebDavBodySize,
  validateWebDavMethod,
  validateWebDavUrl,
} from '../api/_shared/webdavSecurity.ts';

/**
 * These cases are the regression net for the SSRF guard. The pre-existing
 * implementation matched host strings by prefix, which silently let every IPv6
 * literal through because `URL.hostname` keeps the surrounding brackets.
 */

test('isForbiddenHost blocks loopback and local hostnames', () => {
  for (const host of ['localhost', 'LOCALHOST', 'localhost.', 'localhost.localdomain']) {
    assert.equal(isForbiddenHost(host), true, `${host} should be forbidden`);
  }
});

test('isForbiddenHost blocks IPv6 loopback and unspecified, brackets included', () => {
  // `new URL('http://[::1]/').hostname` returns '[::1]' — brackets and all.
  assert.equal(new URL('http://[::1]/').hostname, '[::1]');
  for (const host of ['[::1]', '::1', '[::]', '::', '[0:0:0:0:0:0:0:1]']) {
    assert.equal(isForbiddenHost(host), true, `${host} should be forbidden`);
  }
});

test('isForbiddenHost blocks IPv4-mapped and NAT64 IPv6 forms', () => {
  for (const host of ['[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[::ffff:10.0.0.1]', '[64:ff9b::7f00:1]']) {
    assert.equal(isForbiddenHost(host), true, `${host} should be forbidden`);
  }
  // A mapped public address is still allowed.
  assert.equal(isForbiddenHost('[::ffff:8.8.8.8]'), false);
});

test('isForbiddenHost blocks IPv6 unique-local, link-local and multicast', () => {
  for (const host of ['[fd00::1]', '[fc00::1]', '[fdff:ffff::1]', '[fe80::1]', '[febf::1]', '[ff02::1]']) {
    assert.equal(isForbiddenHost(host), true, `${host} should be forbidden`);
  }
  // fe00::/9 is not link-local; 2001:db8::/32 is documentation, not internal.
  assert.equal(isForbiddenHost('[fe00::1]'), false);
  assert.equal(isForbiddenHost('[2606:4700:4700::1111]'), false);
});

test('isForbiddenHost blocks every reserved IPv4 range', () => {
  const forbidden = [
    '0.0.0.0', '0.1.2.3',
    '10.0.0.0', '10.255.255.255',
    '100.64.0.1', '100.127.255.255',
    '127.0.0.1', '127.255.255.255',
    '169.254.1.1',
    '172.16.0.1', '172.31.255.255',
    '192.0.0.1', '192.0.2.1', '192.88.99.1',
    '192.168.0.1', '192.168.255.255',
    '198.18.0.1', '198.19.255.255',
    '198.51.100.1', '203.0.113.1',
    '224.0.0.1', '240.0.0.1', '255.255.255.255',
  ];
  for (const host of forbidden) {
    assert.equal(isForbiddenHost(host), true, `${host} should be forbidden`);
  }
});

test('isForbiddenHost protects the range boundaries without over-blocking', () => {
  const allowed = [
    '9.255.255.255', '11.0.0.0',
    '100.63.255.255', '100.128.0.0',
    '126.255.255.255', '128.0.0.0',
    '172.15.255.255', '172.32.0.0',
    '192.167.255.255', '192.169.0.0',
    '198.17.255.255', '198.20.0.0',
    '203.0.112.255', '203.0.114.0',
  ];
  for (const host of allowed) {
    assert.equal(isForbiddenHost(host), false, `${host} should be allowed`);
  }
});

test('isForbiddenHost blocks cloud metadata and internal suffixes', () => {
  for (const host of ['metadata.google.internal', 'metadata', 'instance-data', 'db.internal', 'printer.local']) {
    assert.equal(isForbiddenHost(host), true, `${host} should be forbidden`);
  }
});

test('isForbiddenHost allows ordinary public WebDAV hosts', () => {
  const allowed = [
    'dav.jianguoyun.com',
    'webdav.example.com',
    'example.com',
    '192.168.0.1.evil.com',
    'localhost.evil.com',
  ];
  for (const host of allowed) {
    assert.equal(isForbiddenHost(host), false, `${host} should be allowed`);
  }
});

test('isForbiddenHost rejects empty input', () => {
  assert.equal(isForbiddenHost(''), true);
  assert.equal(isForbiddenHost('   '), true);
});

test('validateWebDavUrl normalises a public HTTPS endpoint', () => {
  const result = validateWebDavUrl('https://dav.jianguoyun.com/dav/');
  assert.ok(result instanceof URL);
  assert.equal(result.hostname, 'dav.jianguoyun.com');
});

test('validateWebDavUrl rejects malformed and unsupported URLs', () => {
  assert.deepEqual(validateWebDavUrl('not a url'), { error: 'Invalid URL format' });
  assert.deepEqual(validateWebDavUrl('ftp://example.com/'), { error: 'Unsupported protocol' });
});

test('validateWebDavUrl rejects every address the blocklist forbids', () => {
  for (const url of ['https://127.0.0.1/dav/', 'https://[::1]/dav/', 'https://[fd00::1]/dav/', 'https://169.254.169.254/latest/meta-data/']) {
    assert.deepEqual(
      validateWebDavUrl(url),
      { error: 'Access to the requested host is forbidden' },
      `${url} should be rejected`,
    );
  }
});

test('validateWebDavUrl requires HTTPS outside development', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.deepEqual(validateWebDavUrl('http://dav.example.com/'), {
      error: 'HTTPS is required for WebDAV connections',
    });

    process.env.NODE_ENV = 'development';
    assert.ok(validateWebDavUrl('http://dav.example.com/') instanceof URL);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('validateWebDavMethod only allows the WebDAV verb set', () => {
  assert.equal(validateWebDavMethod('get'), 'GET');
  assert.equal(validateWebDavMethod('propfind'), 'PROPFIND');
  assert.deepEqual(validateWebDavMethod('TRACE'), { error: 'Method not allowed' });
  assert.deepEqual(validateWebDavMethod(''), { error: 'Method not allowed' });
});

test('validateWebDavBodySize enforces per-method limits', () => {
  assert.equal(validateWebDavBodySize('PUT', 'x'.repeat(10 * 1024 * 1024)), null);
  assert.deepEqual(validateWebDavBodySize('PUT', 'x'.repeat(10 * 1024 * 1024 + 1)), {
    error: 'Request body exceeds size limit',
  });
  assert.equal(validateWebDavBodySize('PROPFIND', 'x'.repeat(256 * 1024)), null);
  assert.deepEqual(validateWebDavBodySize('PROPFIND', 'x'.repeat(256 * 1024 + 1)), {
    error: 'PROPFIND request body exceeds size limit',
  });
  // GET carries no body, so it is never size-limited.
  assert.equal(validateWebDavBodySize('GET', 'x'.repeat(20 * 1024 * 1024)), null);
});
