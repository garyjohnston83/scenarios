import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import scenariosReducer from './scenariosSlice';
import adminReducer from './adminSlice';
import analysisReducer from './analysisSlice';
import scenarioTypeAdminReducer from './scenarioTypeAdminSlice';
import dataTemplateReducer from './dataTemplateSlice';
import reportDefinitionAdminReducer from './reportDefinitionAdminSlice';
import changeViewDefinitionAdminReducer from './changeViewDefinitionAdminSlice';
import signoffPolicyDefinitionAdminReducer from './signoffPolicyDefinitionAdminSlice';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    scenarios: scenariosReducer,
    admin: adminReducer,
    analysis: analysisReducer,
    scenarioTypeAdmin: scenarioTypeAdminReducer,
    dataTemplate: dataTemplateReducer,
    reportDefinitionAdmin: reportDefinitionAdminReducer,
    changeViewDefinitionAdmin: changeViewDefinitionAdminReducer,
    signoffPolicyDefinitionAdmin: signoffPolicyDefinitionAdminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
