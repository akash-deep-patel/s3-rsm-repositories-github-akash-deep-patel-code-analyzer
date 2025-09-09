import { configureStore } from '@reduxjs/toolkit';
import bitbucketReducer from './bitbucketSlice';
import githubReducer from './githubSlice';

export const store = configureStore({
  reducer: {
    bitbucket: bitbucketReducer,
    github: githubReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
