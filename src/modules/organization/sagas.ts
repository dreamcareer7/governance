import { put, call, takeLatest, select } from 'redux-saga/effects'
import { connect } from '@aragon/connect'
import { loadOrganizationFailure, loadOrganizationSuccess, LOAD_ORGANIZATION_REQUEST, loadOrganizationRequest } from './actions'
import { CHANGE_ACCOUNT, CHANGE_NETWORK } from 'decentraland-dapps/dist/modules/wallet/actions'
import { STORAGE_LOAD } from 'decentraland-dapps/dist/modules/storage/actions'
import { loadAppsRequest } from 'modules/app/actions'
import { getNetwork } from 'modules/wallet/selectors'
import { ORGANIZATION_LOCATION, ORGANIZATION_CONNECTOR, Organization } from './types'
import { Network } from 'modules/wallet/types'

export function* organizationSaga() {
  yield takeLatest('_' + LOAD_ORGANIZATION_REQUEST, connectAragon)
  yield takeLatest('_' + STORAGE_LOAD, connectAragon)
  yield takeLatest('_' + CHANGE_ACCOUNT, reconnectAragon)
  yield takeLatest('_' + CHANGE_NETWORK, reconnectAragon)
}

function* reconnectAragon() {
  yield put(loadOrganizationRequest())
}

function* connectAragon() {
  try {
    const network: Network = yield select(getNetwork)

    const organization: Organization = yield call(() => connect(
      ORGANIZATION_LOCATION[network],
      ORGANIZATION_CONNECTOR[network],
      { network }
    ))

    yield put(loadOrganizationSuccess(organization))
    yield put(loadAppsRequest())

  } catch (e) {
    yield put(loadOrganizationFailure(e.message))
  }
}
