import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import scenariosReducer from './scenariosSlice';
import adminReducer from './adminSlice';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    scenarios: scenariosReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
