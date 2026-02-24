import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { all, fork } from 'redux-saga/effects';
import adminReducer, {
  AdminState,
  fetchPoliciesRequest,
  createPolicyRequest,
  updatePolicyRequest,
} from '../adminSlice';
import {
  watchFetchPolicies,
  watchCreatePolicy,
  watchUpdatePolicy,
} from '../adminSaga';
import * as adminApi from '../../services/adminApi';
import type { SignoffPolicyDto } from '../../services/adminApi';

// Mock the API module
jest.mock('../../services/adminApi');
const mockedApi = adminApi as jest.Mocked<typeof adminApi>;

const samplePolicy: SignoffPolicyDto = {
  id: 'policy-1',
  scenarioTypeCode: 'MARKET_DATA',
  name: 'Default Market Data Policy',
  requiredApproverCount: 2,
  isEnabled: true,
  priority: 1,
  createdAt: '2026-02-20T10:00:00',
  updatedAt: '2026-02-21T15:30:00',
};

const samplePolicy2: SignoffPolicyDto = {
  id: 'policy-2',
  scenarioTypeCode: 'RISK_FACTOR',
  name: 'Default Risk Factor Policy',
  requiredApproverCount: 3,
  isEnabled: false,
  priority: 2,
  createdAt: '2026-02-19T08:00:00',
  updatedAt: '2026-02-20T12:00:00',
};

function* rootSaga() {
  yield all([
    fork(watchFetchPolicies),
    fork(watchCreatePolicy),
    fork(watchUpdatePolicy),
  ]);
}

function createStoreWithSaga(initialState?: Partial<AdminState>) {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: {
      admin: adminReducer,
    },
    preloadedState: initialState
      ? { admin: { policies: [], loading: false, error: null, saving: false, ...initialState } }
      : undefined,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(sagaMiddleware),
  });
  sagaMiddleware.run(rootSaga);
  return store;
}

// Helper to wait for async saga effects to complete
const waitForSaga = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('Increment 12 TG6 Gap Tests -- Admin Saga Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Gap Test: fetchPolicies saga dispatches fetchPoliciesSuccess on API response
  it('fetchPoliciesRequest triggers API call and dispatches fetchPoliciesSuccess', async () => {
    const policies = [samplePolicy, samplePolicy2];
    mockedApi.fetchSignoffPolicies.mockResolvedValue(policies);

    const store = createStoreWithSaga();
    store.dispatch(fetchPoliciesRequest());

    await waitForSaga();

    expect(mockedApi.fetchSignoffPolicies).toHaveBeenCalledTimes(1);
    const state = store.getState().admin;
    expect(state.policies).toHaveLength(2);
    expect(state.policies[0].name).toBe('Default Market Data Policy');
    expect(state.policies[1].name).toBe('Default Risk Factor Policy');
    expect(state.loading).toBe(false);
  });

  // Gap Test: createPolicy saga dispatches createPolicySuccess and triggers refresh
  it('createPolicyRequest triggers API call, dispatches createPolicySuccess, and refreshes', async () => {
    const createdPolicy: SignoffPolicyDto = {
      id: 'policy-new',
      scenarioTypeCode: 'MARKET_DATA',
      name: 'New Policy',
      requiredApproverCount: 4,
      isEnabled: true,
      priority: 2,
      createdAt: '2026-02-22T10:00:00',
      updatedAt: '2026-02-22T10:00:00',
    };

    mockedApi.createSignoffPolicy.mockResolvedValue(createdPolicy);
    // The saga dispatches fetchPoliciesRequest after create success, so mock the fetch too
    mockedApi.fetchSignoffPolicies.mockResolvedValue([samplePolicy, createdPolicy]);

    const store = createStoreWithSaga();
    store.dispatch(
      createPolicyRequest({
        name: 'New Policy',
        scenarioTypeCode: 'MARKET_DATA',
        requiredApproverCount: 4,
        isEnabled: true,
        priority: 2,
      })
    );

    await waitForSaga();

    expect(mockedApi.createSignoffPolicy).toHaveBeenCalledTimes(1);
    expect(mockedApi.createSignoffPolicy).toHaveBeenCalledWith({
      name: 'New Policy',
      scenarioTypeCode: 'MARKET_DATA',
      requiredApproverCount: 4,
      isEnabled: true,
      priority: 2,
    });

    // After the saga chain (createPolicySuccess -> fetchPoliciesRequest -> fetchPoliciesSuccess),
    // the store should have the refreshed list
    expect(mockedApi.fetchSignoffPolicies).toHaveBeenCalled();
    const state = store.getState().admin;
    expect(state.saving).toBe(false);
  });

  // Gap Test: updatePolicy saga dispatches updatePolicySuccess and triggers refresh
  it('updatePolicyRequest triggers API call, dispatches updatePolicySuccess, and refreshes', async () => {
    const updatedPolicy: SignoffPolicyDto = {
      ...samplePolicy,
      name: 'Updated Market Data Policy',
      requiredApproverCount: 5,
    };

    mockedApi.updateSignoffPolicy.mockResolvedValue(updatedPolicy);
    mockedApi.fetchSignoffPolicies.mockResolvedValue([updatedPolicy, samplePolicy2]);

    const store = createStoreWithSaga({ policies: [samplePolicy, samplePolicy2] });
    store.dispatch(
      updatePolicyRequest({
        id: 'policy-1',
        body: {
          name: 'Updated Market Data Policy',
          requiredApproverCount: 5,
          isEnabled: true,
          priority: 1,
        },
      })
    );

    await waitForSaga();

    expect(mockedApi.updateSignoffPolicy).toHaveBeenCalledTimes(1);
    expect(mockedApi.updateSignoffPolicy).toHaveBeenCalledWith('policy-1', {
      name: 'Updated Market Data Policy',
      requiredApproverCount: 5,
      isEnabled: true,
      priority: 1,
    });

    // After the saga chain, the store should have the refreshed list
    expect(mockedApi.fetchSignoffPolicies).toHaveBeenCalled();
    const state = store.getState().admin;
    expect(state.saving).toBe(false);
  });
});
