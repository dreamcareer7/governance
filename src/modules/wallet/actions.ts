import { buildTransactionPayload } from 'decentraland-dapps/dist//modules/transaction/utils'
import { action } from 'typesafe-actions'
import { Wallet } from './types'

export const EXTEND_WALLET_REQUEST = '[Request] Extend wallet'
export const EXTEND_WALLET_SUCCESS = '[Success] Extend wallet'
export const EXTEND_WALLET_FAILURE = '[Failure] Extend wallet'

export const extendWalletRequest = () => action(EXTEND_WALLET_REQUEST, {})
export const extendWalletSuccess = (wallet: Wallet | null) => action(EXTEND_WALLET_SUCCESS, wallet)
export const extendWalletFailure = (error: string) => action(EXTEND_WALLET_FAILURE, { error })

export type ExtendWalletRequestAction = ReturnType<typeof extendWalletRequest>
export type ExtendWalletSuccessAction = ReturnType<typeof extendWalletSuccess>
export type ExtendWalletFailureAction = ReturnType<typeof extendWalletFailure>

export const ALLOW_MANA_REQUEST = '[Request] Allow mana'
export const ALLOW_MANA_SUCCESS = '[Success] Allow mana'
export const ALLOW_MANA_FAILURE = '[Failure] Allow mana'

export const allowManaRequest = () => action(ALLOW_MANA_REQUEST, {})
export const allowManaSuccess = (hash?: string) => action(ALLOW_MANA_SUCCESS, hash ? buildTransactionPayload(hash) : {})
export const allowManaFailure = (error: string) => action(ALLOW_MANA_FAILURE, { error })

export type AllowManaRequestAction = ReturnType<typeof allowManaRequest>
export type AllowManaSuccessAction = ReturnType<typeof allowManaSuccess>
export type AllowManaFailureAction = ReturnType<typeof allowManaFailure>

export const ALLOW_LAND_REQUEST = '[Request] Allow land'
export const ALLOW_LAND_SUCCESS = '[Success] Allow land'
export const ALLOW_LAND_FAILURE = '[Failure] Allow land'

export const allowLandRequest = () => action(ALLOW_LAND_REQUEST, {})
export const allowLandSuccess = (hash: string) => action(ALLOW_LAND_SUCCESS, buildTransactionPayload(hash))
export const allowLandFailure = (error: string) => action(ALLOW_LAND_FAILURE, { error })

export type AllowLandRequestAction = ReturnType<typeof allowLandRequest>
export type AllowLandSuccessAction = ReturnType<typeof allowLandSuccess>
export type AllowLandFailureAction = ReturnType<typeof allowLandFailure>

export const ALLOW_ESTATE_REQUEST = '[Request] Allow estate'
export const ALLOW_ESTATE_SUCCESS = '[Success] Allow estate'
export const ALLOW_ESTATE_FAILURE = '[Failure] Allow estate'

export const allowEstateRequest = () => action(ALLOW_ESTATE_REQUEST, {})
export const allowEstateSuccess = (hash: string) => action(ALLOW_ESTATE_SUCCESS, buildTransactionPayload(hash))
export const allowEstateFailure = (error: string) => action(ALLOW_ESTATE_FAILURE, { error })

export type AllowEstateRequestAction = ReturnType<typeof allowEstateRequest>
export type AllowEstateSuccessAction = ReturnType<typeof allowEstateSuccess>
export type AllowEstateFailureAction = ReturnType<typeof allowEstateFailure>

export const WRAP_MANA_REQUEST = '[Request] Wrap MANA'
export const WRAP_MANA_SUCCESS = '[Success] Wrap MANA'
export const WRAP_MANA_FAILURE = '[Failure] Wrap MANA'

export const wrapManaRequest = (amount: number) => action(WRAP_MANA_REQUEST, { amount })
export const wrapManaSuccess = (hash: string) => action(WRAP_MANA_SUCCESS, buildTransactionPayload(hash))
export const wrapManaFailure = (error: string) => action(WRAP_MANA_FAILURE, { error })

export type WrapManaRequestAction = ReturnType<typeof wrapManaRequest>
export type WrapManaSuccessAction = ReturnType<typeof wrapManaSuccess>
export type WrapManaFailureAction = ReturnType<typeof wrapManaFailure>

export const UNWRAP_MANA_REQUEST = '[Request] Unwrap MANA'
export const UNWRAP_MANA_SUCCESS = '[Success] Unwrap MANA'
export const UNWRAP_MANA_FAILURE = '[Failure] Unwrap MANA'

export const unwrapManaRequest = (amount: number) => action(UNWRAP_MANA_REQUEST, { amount })
export const unwrapManaSuccess = (hash: string) => action(UNWRAP_MANA_SUCCESS, buildTransactionPayload(hash))
export const unwrapManaFailure = (error: string) => action(UNWRAP_MANA_FAILURE, { error })

export type UnwrapManaRequestAction = ReturnType<typeof unwrapManaRequest>
export type UnwrapManaSuccessAction = ReturnType<typeof unwrapManaSuccess>
export type UnwrapManaFailureAction = ReturnType<typeof unwrapManaFailure>
