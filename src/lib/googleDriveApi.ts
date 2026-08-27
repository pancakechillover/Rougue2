export class GoogleDriveAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Google Drive token expired or invalid');
      }
      throw new Error(`Google Drive API Error: ${response.status} ${response.statusText}`);
    }
    return response;
  }

  async findSaveFile(): Promise<string | null> {
    return this.findFileByName('scholars_dungeon_save.json');
  }

  async findFileByName(filename: string): Promise<string | null> {
    const response = await this.request(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,modifiedTime)`
    );
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  async readSaveFile(fileId: string): Promise<any> {
    const response = await this.request(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
    return await response.json();
  }

  async createSaveFile(data: any): Promise<string> {
    return this.createFileByName('scholars_dungeon_save.json', data);
  }

  async createFileByName(filename: string, data: any): Promise<string> {
    const metadata = {
      name: filename,
      parents: ['appDataFolder']
    };
    
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(data) +
      closeDelimiter;

    const response = await this.request(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );
    const result = await response.json();
    return result.id;
  }

  async updateSaveFile(fileId: string, data: any): Promise<void> {
    await this.request(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  }

  async deleteSaveFile(fileId: string): Promise<void> {
    await this.request(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE'
      }
    );
  }
}
