// utils/session.js
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

function generateSessionToken() {
  return uuidv4();
}

function getSessionExpiry() {
  return dayjs().add(7, 'days').toISOString();
}

export { generateSessionToken, getSessionExpiry };
