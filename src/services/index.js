import { IS_MOCK } from '../constants/config';
import * as mockServices from './mock/mockServices';
import * as realAuthService from './authService';
import * as realUserService from './userService';
import * as realScamService from './scamService';
import * as realClassifiedsService from './classifiedsService';
import * as realChatService from './chatService';
import * as realPeopleService from './peopleService';
import * as realFunctionsService from './functionsService';

export const authService        = IS_MOCK ? mockServices.mockAuthService        : realAuthService;
export const userService        = IS_MOCK ? mockServices.mockUserService        : realUserService;
export const scamService        = IS_MOCK ? mockServices.mockScamService        : realScamService;
export const classifiedsService = IS_MOCK ? mockServices.mockClassifiedsService : realClassifiedsService;
export const chatService        = IS_MOCK ? mockServices.mockChatService        : realChatService;
export const peopleService      = IS_MOCK ? mockServices.mockPeopleService      : realPeopleService;
export const functionsService   = IS_MOCK ? mockServices.mockFunctionsService   : realFunctionsService;