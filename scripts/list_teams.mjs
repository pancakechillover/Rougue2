import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

async function run() {
  await redisClient.connect();
  const keys = await redisClient.keys('scholar_team:*');
  
  for (const key of keys) {
    if (key.includes(':')) continue;
    const team = await redisClient.hGetAll(key);
    const membersData = await redisClient.hGetAll(`${key}:members`);
    console.log(`Team ID: ${team.id}, Name: ${team.name}`);
    for (const [userId, memberStr] of Object.entries(membersData)) {
      const m = JSON.parse(memberStr);
      console.log(`  - Member: ${m.name} (isCaptain: ${m.isCaptain}, userId: ${userId})`);
    }
  }
  process.exit(0);
}

run();
