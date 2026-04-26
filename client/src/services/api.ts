import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://hapi.gunz.com.br/api',
});
