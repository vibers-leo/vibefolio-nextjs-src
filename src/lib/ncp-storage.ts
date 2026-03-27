// src/lib/ncp-storage.ts — NCP 서버 파일 업로드 (ssh2)
import { Client } from 'ssh2';
import crypto from 'crypto';
import path from 'path';

const NCP_HOST = '49.50.138.93';
const NCP_USER = 'root';
const NCP_BASE_PATH = '/opt/vibers-storage';
const NCP_PUBLIC_URL = 'https://storage.vibers.co.kr';

function getPassword(): string {
  const pw = process.env.NCP_SSH_PASSWORD;
  if (!pw) throw new Error('NCP_SSH_PASSWORD 환경변수가 설정되지 않았습니다');
  return pw;
}

/** 고유 파일명 생성 */
export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const rand = crypto.randomBytes(6).toString('hex');
  return `${Date.now()}-${rand}${ext}`;
}

/** SSH로 NCP 서버에 파일 업로드 */
export async function uploadToNCP(
  buffer: Buffer,
  remotePath: string, // e.g. "projects/uploads"
  filename: string,
): Promise<string> {
  const fullRemotePath = `${NCP_BASE_PATH}/${remotePath}`;
  const fullFilePath = `${fullRemotePath}/${filename}`;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('SSH 연결 타임아웃 (15초)'));
    }, 15_000);

    conn
      .on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            return reject(err);
          }

          // 디렉토리 생성 후 파일 쓰기
          conn.exec(`mkdir -p ${fullRemotePath}`, (mkdirErr) => {
            if (mkdirErr) {
              clearTimeout(timeout);
              conn.end();
              return reject(mkdirErr);
            }

            const writeStream = sftp.createWriteStream(fullFilePath);
            writeStream.on('close', () => {
              clearTimeout(timeout);
              conn.end();
              const publicUrl = `${NCP_PUBLIC_URL}/${remotePath}/${filename}`;
              resolve(publicUrl);
            });
            writeStream.on('error', (writeErr: Error) => {
              clearTimeout(timeout);
              conn.end();
              reject(writeErr);
            });
            writeStream.end(buffer);
          });
        });
      })
      .on('error', (connErr) => {
        clearTimeout(timeout);
        reject(connErr);
      })
      .connect({
        host: NCP_HOST,
        port: 22,
        username: NCP_USER,
        password: getPassword(),
        readyTimeout: 10_000,
      });
  });
}

/** 파일 삭제 (선택적) */
export async function deleteFromNCP(remotePath: string): Promise<void> {
  const fullPath = `${NCP_BASE_PATH}/${remotePath}`;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('SSH 연결 타임아웃 (10초)'));
    }, 10_000);

    conn
      .on('ready', () => {
        conn.exec(`rm -f ${fullPath}`, (err) => {
          clearTimeout(timeout);
          conn.end();
          if (err) return reject(err);
          resolve();
        });
      })
      .on('error', (connErr) => {
        clearTimeout(timeout);
        reject(connErr);
      })
      .connect({
        host: NCP_HOST,
        port: 22,
        username: NCP_USER,
        password: getPassword(),
        readyTimeout: 10_000,
      });
  });
}
