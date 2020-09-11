import { all, takeLatest, call, select, put } from 'redux-saga/effects'
import { FETCH_TRANSACTION_SUCCESS } from 'decentraland-dapps/dist/modules/transaction/actions'
import { createWalletSaga } from 'decentraland-dapps/dist/modules/wallet/sagas'
import { CONNECT_WALLET_SUCCESS, CHANGE_ACCOUNT, CHANGE_NETWORK } from 'decentraland-dapps/dist/modules/wallet/actions'
import { getData, getMana, getAddress } from 'decentraland-dapps/dist/modules/wallet/selectors'
import { getManaMiniMeContract, getLandContract, getEstateContract, getManaContract } from 'modules/common/selectors'
import { Contract, BigNumber } from 'ethers'
import {
  loadBalanceRequest,
  LOAD_BALANCE_REQUEST,
  loadBalanceFailure,
  loadBalanceSuccess,
  REGISTER_LAND_BALANCE_REQUEST,
  registerLandBalanceSuccess,
  registerLandBalanceFailure,
  REGISTER_ESTATE_BALANCE_REQUEST,
  registerEstateBalanceSuccess,
  registerEstateBalanceFailure,
  WRAP_MANA_REQUEST,
  wrapManaFailure,
  WrapManaRequestAction,
  wrapManaSuccess,
  UnwrapManaRequestAction,
  UNWRAP_MANA_REQUEST,
  unwrapManaSuccess,
  unwrapManaFailure
} from './actions'
import { Wallet, Network } from './types'
import { getNetwork } from './selectors'
import { MANAMiniMeToken } from 'modules/common/contracts'
import { getQuery } from 'routing/selectors'
import { push } from 'connected-react-router'
import { locations } from 'routing/locations'

const VOTING_POWER_BY_LAND = 2_000
const MAX_ALLOWANCE_AMOUNT = BigNumber.from('0xfffffffffffffffffffffffffffffffffffffffffffffffa9438a1d29cefffff')
const EMPTY_ALLOWANCE_AMOUNT = BigNumber.from(0)
const baseWalletSaga = createWalletSaga()

export function* walletSaga() {
  yield all([baseWalletSaga(), projectWalletSaga()])
}

function* projectWalletSaga() {
  yield takeLatest(CONNECT_WALLET_SUCCESS, requestBalance)
  yield takeLatest(CHANGE_ACCOUNT, requestBalance)
  yield takeLatest(CHANGE_NETWORK, requestBalance)
  yield takeLatest(FETCH_TRANSACTION_SUCCESS, requestBalance)
  yield takeLatest(LOAD_BALANCE_REQUEST, getBalance)
  yield takeLatest(REGISTER_LAND_BALANCE_REQUEST, registerLandBalance)
  yield takeLatest(REGISTER_ESTATE_BALANCE_REQUEST, registerEstateBalance)
  yield takeLatest(WRAP_MANA_REQUEST, wrapMana)
  yield takeLatest(UNWRAP_MANA_REQUEST, unwrapMana)
}

function* requestBalance() {
  yield put(loadBalanceRequest())
}

function* getBalance(): any {
  const wallet: Wallet | null = yield select(getData)

  if (wallet) {
    try {
      const manaMiniMeContract: Contract = yield select(getManaMiniMeContract)
      const landContract = yield select(getLandContract)
      const estateContract = yield select(getEstateContract)
      let [
        manaMiniMe,
        land,
        landCommit,
        estate,
        estateSize,
        estateCommit
      ] = yield call(() => Promise.all([
        manaMiniMeContract.balanceOf(wallet.address).catch(console.error),
        landContract.balanceOf(wallet.address).catch(console.error),
        landContract.registeredBalance(wallet.address).catch(console.error),
        estateContract.balanceOf(wallet.address).catch(console.error),
        estateContract.getLANDsSize(wallet.address).catch(console.error),
        estateContract.registeredBalance(wallet.address).catch(console.error)
      ]))

      manaMiniMe = (manaMiniMe || 0) / 1e18
      land = BigNumber.from(land || 0).toNumber()
      landCommit = !!landCommit
      estate = BigNumber.from(estate || 0).toNumber()
      estateSize = BigNumber.from(estateSize || 0).toNumber()
      estateCommit = !!estateCommit

      const manaVotingPower = manaMiniMe
      const landVotingPower = landCommit ? land * VOTING_POWER_BY_LAND : 0
      const estateVotingPower = estate * estateSize * VOTING_POWER_BY_LAND
      const votingPower = manaVotingPower + landVotingPower + estateVotingPower

      yield put(loadBalanceSuccess({
        ...wallet,
        manaMiniMe,
        land,
        landCommit,
        estate,
        estateSize,
        estateCommit,
        manaVotingPower,
        landVotingPower,
        estateVotingPower,
        votingPower
      }))

    } catch (err) {
      yield put(loadBalanceFailure(err.message))
    }
  } else {
    yield put(loadBalanceSuccess(wallet))
  }
}

function* registerLandBalance() {
  try {
    const landContract = yield select(getLandContract)
    const tx = yield call(() => landContract.registerBalance())
    yield put(registerLandBalanceSuccess(tx.hash))
  } catch (err) {
    yield put(registerLandBalanceFailure(err.message))
  }
}

function* registerEstateBalance() {
  try {
    const estateContract = yield select(getEstateContract)
    const tx = yield call(() => estateContract.registerBalance())
    yield put(registerEstateBalanceSuccess(tx.hash))
  } catch (err) {
    yield put(registerEstateBalanceFailure(err.message))
  }
}

function* wrapMana(action: WrapManaRequestAction) {
  try {
    const mana: number = yield select(getMana)
    const amount: number = Math.max(Math.min(action.payload.amount || 0, mana), 0)
    const address: string = yield select(getAddress)
    const network: Network = yield select(getNetwork)
    const wrapAddress = MANAMiniMeToken[network]
    const manaContract: Contract = yield select(getManaContract)
    const manaMiniMeContract: Contract = yield select(getManaMiniMeContract)

    const [ allowed ]: [ BigNumber ] = yield call(() => manaContract.functions.allowance(address, wrapAddress))
    const value = BigInt(amount) * BigInt(1e18)

    if (!allowed.eq(MAX_ALLOWANCE_AMOUNT) && !allowed.eq(EMPTY_ALLOWANCE_AMOUNT)) {
      const clearTx = yield call(() => manaContract.functions.approve(wrapAddress, EMPTY_ALLOWANCE_AMOUNT))
      yield call(() => clearTx.wait(1))
    }

    if (!allowed.eq(MAX_ALLOWANCE_AMOUNT)) {
      const approveTx = yield call(() => manaContract.functions.approve(wrapAddress, MAX_ALLOWANCE_AMOUNT))
      yield call(() => approveTx.wait(1))
    }

    const depositTx = yield call(() => manaMiniMeContract.functions.deposit(value))
    yield put(wrapManaSuccess(depositTx.hash))

  } catch (err) {
    yield put(wrapManaFailure(err.message))
  }
}

function* unwrapMana(action: UnwrapManaRequestAction) {
  try {
    const mana: number = yield select(getMana)
    const amount: number = Math.max(Math.min(action.payload.amount || 0, mana), 0)
    const manaMiniMeContract: Contract = yield select(getManaMiniMeContract)

    const value = BigInt(amount) * BigInt(1e18)
    const depositTx = yield call(() => manaMiniMeContract.functions.withdraw(value))

    yield put(unwrapManaSuccess(depositTx.hash))
    const query: Record<string, string> = yield select(getQuery)
    yield put(push(locations.wrapping({ ...query, completed: true })))
  } catch (err) {
    yield put(unwrapManaFailure(err.message))
  }
}
