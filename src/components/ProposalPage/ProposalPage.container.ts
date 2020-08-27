import { connect } from 'react-redux'
import { connectWalletRequest } from 'decentraland-dapps/dist/modules/wallet/actions'
import { isConnected, isConnecting } from 'decentraland-dapps/dist/modules/wallet/selectors'
import { isLoadingType } from 'decentraland-dapps/dist/modules/loading/selectors'

import { RootState } from 'modules/root/types'
import { /* getData, */ getLoading as getLoadingOrganization } from 'modules/organization/selectors'
import { /* getData, */ getLoading as getLoadingApps } from 'modules/app/selectors'
import { LOAD_APPS_REQUEST } from 'modules/app/actions'
import { getData as getVotes, getLoading as getLoadingVotes } from 'modules/vote/selectors'
import { LOAD_VOTES_REQUEST } from 'modules/vote/actions'
import ProposalPage from './ProposalPage'
import { MapDispatchProps, MapStateProps, MapDispatch } from './ProposalPage.types'

const mapState = (state: RootState): MapStateProps => ({
  votes: getVotes(state),
  isConnected: isConnected(state),
  isConnecting: isConnecting(state),
  isLoading: (
    isConnecting(state) ||
    getLoadingOrganization(state) ||
    isLoadingType(getLoadingApps(state), LOAD_APPS_REQUEST) ||
    isLoadingType(getLoadingVotes(state), LOAD_VOTES_REQUEST)
  )
})

const mapDispatch = (dispatch: MapDispatch): MapDispatchProps => ({
  onConnect: () => dispatch(connectWalletRequest())
})

export default connect(mapState, mapDispatch)(ProposalPage)
