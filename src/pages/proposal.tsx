import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import { useLocation } from '@gatsbyjs/reach-router'
import Head from 'decentraland-gatsby/dist/components/Head/Head'
import { formatDescription } from 'decentraland-gatsby/dist/components/Head/utils'
import MaintenancePage from 'decentraland-gatsby/dist/components/Layout/MaintenancePage'
import NotFound from 'decentraland-gatsby/dist/components/Layout/NotFound'
import Markdown from 'decentraland-gatsby/dist/components/Text/Markdown'
import useAuthContext from 'decentraland-gatsby/dist/context/Auth/useAuthContext'
import useAsyncMemo from 'decentraland-gatsby/dist/hooks/useAsyncMemo'
import useAsyncTask from 'decentraland-gatsby/dist/hooks/useAsyncTask'
import useFormatMessage from 'decentraland-gatsby/dist/hooks/useFormatMessage'
import usePatchState from 'decentraland-gatsby/dist/hooks/usePatchState'
import { navigate } from 'decentraland-gatsby/dist/plugins/intl'
import retry from 'decentraland-gatsby/dist/utils/promise/retry'
import { Button } from 'decentraland-ui/dist/components/Button/Button'
import { Header } from 'decentraland-ui/dist/components/Header/Header'
import { Loader } from 'decentraland-ui/dist/components/Loader/Loader'
import Grid from 'semantic-ui-react/dist/commonjs/collections/Grid/Grid'
import { Address } from 'web3x/address'
import { Personal } from 'web3x/personal'

import { Governance } from '../api/Governance'
import { Snapshot } from '../api/Snapshot'
import CategoryLabel from '../components/Category/CategoryLabel'
import ContentLayout, { ContentSection } from '../components/Layout/ContentLayout'
import { DeleteProposalModal } from '../components/Modal/DeleteProposalModal/DeleteProposalModal'
import ProposalSuccessModal from '../components/Modal/ProposalSuccessModal'
import { UpdateProposalStatusModal } from '../components/Modal/UpdateProposalStatusModal/UpdateProposalStatusModal'
import UpdateSuccessModal from '../components/Modal/UpdateSuccessModal'
import { VoteRegisteredModal } from '../components/Modal/Votes/VoteRegisteredModal'
import { VotesList } from '../components/Modal/Votes/VotesList'
import ProposalComments from '../components/Proposal/ProposalComments'
import ProposalFooterPoi from '../components/Proposal/ProposalFooterPoi'
import ProposalHeaderPoi from '../components/Proposal/ProposalHeaderPoi'
import ProposalUpdates from '../components/Proposal/ProposalUpdates'
import ForumButton from '../components/Section/ForumButton'
import ProposalDetailSection from '../components/Section/ProposalDetailSection'
import ProposalResultSection from '../components/Section/ProposalResultSection'
import ProposalVestingStatus from '../components/Section/ProposalVestingStatus'
import SubscribeButton from '../components/Section/SubscribeButton'
import VestingSection from '../components/Section/VestingSection'
import StatusLabel from '../components/Status/StatusLabel'
import { ProposalStatus, ProposalType } from '../entities/Proposal/types'
import { forumUrl } from '../entities/Proposal/utils'
import useIsCommittee from '../hooks/useIsCommittee'
import useProposal from '../hooks/useProposal'
import useProposalUpdates from '../hooks/useProposalUpdates'
import locations from '../modules/locations'
import { isUnderMaintenance } from '../modules/maintenance'

import './index.css'
import './proposal.css'

type ProposalPageOptions = {
  changing: boolean
  confirmSubscription: boolean
  confirmDeletion: boolean
  confirmStatusUpdate: ProposalStatus | false
  showVotesList: boolean
  showProposalSuccessModal: boolean
  showUpdateSuccessModal: boolean
}

export default function ProposalPage() {
  const t = useFormatMessage()
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const [options, patchOptions] = usePatchState<ProposalPageOptions>({
    changing: false,
    confirmSubscription: false,
    confirmDeletion: false,
    confirmStatusUpdate: false,
    showVotesList: false,
    showProposalSuccessModal: false,
    showUpdateSuccessModal: false,
  })
  const patchOptionsRef = useRef(patchOptions)
  const [account, { provider }] = useAuthContext()
  const [proposal, proposalState] = useProposal(params.get('id'))
  const { isCommittee } = useIsCommittee(account)
  const [votes, votesState] = useAsyncMemo(() => Governance.get().getProposalVotes(proposal!.id), [proposal], {
    callWithTruthyDeps: true,
  })
  const [subscriptions, subscriptionsState] = useAsyncMemo(
    () => Governance.get().getSubscriptions(proposal!.id),
    [proposal],
    { callWithTruthyDeps: true }
  )

  const { publicUpdates, pendingUpdates, nextUpdate, currentUpdate } = useProposalUpdates(proposal?.id)

  const subscribed = useMemo(
    () => !!account && !!subscriptions && !!subscriptions.find((sub) => sub.user === account),
    [account, subscriptions]
  )
  const [voting, vote] = useAsyncTask(
    async (_: string, choiceIndex: number) => {
      if (proposal && account && provider && votes) {
        const message = await Snapshot.get().createVoteMessage(
          proposal.snapshot_space,
          proposal.snapshot_id,
          choiceIndex
        )
        const signature = await new Personal(provider).sign(message, Address.fromString(account), '')
        await retry(3, () => Snapshot.get().send(account, message, signature))
        patchOptions({ changing: false, confirmSubscription: !votes[account] })
        votesState.reload()
      }
    },
    [proposal, account, provider, votes]
  )

  const [subscribing, subscribe] = useAsyncTask<[subscribe?: boolean | undefined]>(
    async (subscribe = true) => {
      if (proposal) {
        if (subscribe) {
          const newSubscription = await Governance.get().subscribe(proposal.id)
          subscriptionsState.set((current) => [...(current || []), newSubscription])
        } else {
          await Governance.get().unsubscribe(proposal.id)
          subscriptionsState.set((current) =>
            (current || []).filter((subscription) => subscription.proposal_id !== proposal.id)
          )
        }

        patchOptions({ confirmSubscription: false })
      }
    },
    [proposal, subscriptionsState]
  )

  const [updatingStatus, updateProposalStatus] = useAsyncTask(
    async (status: ProposalStatus, vesting_address: string | null, description: string) => {
      if (proposal && isCommittee) {
        const updateProposal = await Governance.get().updateProposalStatus(
          proposal.id,
          status,
          vesting_address,
          description
        )
        proposalState.set(updateProposal)
        patchOptions({ confirmStatusUpdate: false })
      }
    },
    [proposal, account, isCommittee, proposalState, patchOptions]
  )

  const isOwner = useMemo(() => !!(proposal && account && proposal.user === account), [proposal, account])

  const [deleting, deleteProposal] = useAsyncTask(async () => {
    if (proposal && account && (proposal.user === account || isCommittee)) {
      await Governance.get().deleteProposal(proposal.id)
      navigate(locations.proposals())
    }
  }, [proposal, account, isCommittee])

  useEffect(() => {
    patchOptionsRef.current({ showProposalSuccessModal: params.get('new') === 'true' })
  }, [params])

  useEffect(() => {
    patchOptionsRef.current({ showUpdateSuccessModal: params.get('newUpdate') === 'true' })
  }, [params])

  const closeProposalSuccessModal = () => {
    patchOptions({ showProposalSuccessModal: false })
    navigate(locations.proposal(proposal!.id), { replace: true })
  }

  const closeUpdateSuccessModal = () => {
    patchOptions({ showUpdateSuccessModal: false })
    navigate(locations.proposal(proposal!.id), { replace: true })
  }

  const handlePostUpdateClick = useCallback(() => {
    if (proposal === null) {
      return
    }

    const hasPendingUpdates = pendingUpdates && pendingUpdates.length > 0
    navigate(
      locations.submitUpdate({
        ...(hasPendingUpdates && { id: currentUpdate?.id }),
        proposalId: proposal.id,
      })
    )
  }, [currentUpdate?.id, pendingUpdates, proposal])

  if (proposalState.error) {
    return (
      <>
        <ContentLayout className="ProposalDetailPage">
          <NotFound />
        </ContentLayout>
      </>
    )
  }

  if (isUnderMaintenance()) {
    return (
      <>
        <Head
          title={t('page.proposal_detail.title') || ''}
          description={t('page.proposal_detail.description') || ''}
          image="https://decentraland.org/images/decentraland.png"
        />
        <ContentLayout className="ProposalDetailPage">
          <MaintenancePage />
        </ContentLayout>
      </>
    )
  }

  const showVestingStatus =
    proposal?.status === ProposalStatus.Enacted && proposal?.type === ProposalType.Grant && isOwner
  const showProposalUpdates =
    publicUpdates && proposal?.status === ProposalStatus.Enacted && proposal?.type === ProposalType.Grant

  return (
    <>
      <Head
        title={proposal?.title || t('page.proposal_detail.title') || ''}
        description={
          (proposal?.description && formatDescription(proposal?.description)) ||
          t('page.proposal_detail.description') ||
          ''
        }
        image="https://decentraland.org/images/decentraland.png"
      />
      <ContentLayout className="ProposalDetailPage">
        <ContentSection>
          <Header size="huge">{proposal?.title || ''} &nbsp;</Header>
          <Loader active={!proposal} />
          <div className="ProposalDetailPage__Labels">
            {proposal && <StatusLabel status={proposal.status} />}
            {proposal && <CategoryLabel type={proposal.type} />}
          </div>
        </ContentSection>
        <Grid stackable>
          <Grid.Row>
            <Grid.Column tablet="12" className="ProposalDetailDescription">
              <Loader active={proposalState.loading} />
              <ProposalHeaderPoi proposal={proposal} />
              <Markdown>{proposal?.description || ''}</Markdown>
              {proposal?.type === ProposalType.POI && <ProposalFooterPoi configuration={proposal.configuration} />}
              {showProposalUpdates && <ProposalUpdates proposal={proposal} updates={publicUpdates} />}
              <ProposalComments proposal={proposal} loading={proposalState.loading} />
            </Grid.Column>

            <Grid.Column tablet="4" className="ProposalDetailActions">
              {!!proposal?.vesting_address && <VestingSection vestingAddress={proposal.vesting_address} />}
              <ForumButton
                loading={proposalState.loading}
                disabled={!proposal}
                href={(proposal && forumUrl(proposal)) || ''}
              />
              <SubscribeButton
                loading={proposalState.loading || subscriptionsState.loading || subscribing}
                disabled={!proposal}
                subscribed={subscribed}
                onClick={() => subscribe(!subscribed)}
              />
              {showVestingStatus && (
                <ProposalVestingStatus
                  nextUpdate={nextUpdate}
                  currentUpdate={currentUpdate}
                  pendingUpdates={pendingUpdates}
                  onPostUpdateClick={handlePostUpdateClick}
                />
              )}
              <ProposalResultSection
                disabled={!proposal || !votes}
                loading={voting || proposalState.loading || votesState.loading}
                proposal={proposal}
                votes={votes}
                changingVote={options.changing}
                onChangeVote={(_, changing) => patchOptions({ changing })}
                onOpenVotesList={() => patchOptions({ showVotesList: true })}
                onVote={(_, choice, choiceIndex) => vote(choice, choiceIndex)}
              />
              {proposal && <ProposalDetailSection proposal={proposal} />}
              {(isOwner || isCommittee) && (
                <Button
                  basic
                  fluid
                  loading={deleting}
                  disabled={proposal?.status !== ProposalStatus.Pending && proposal?.status !== ProposalStatus.Active}
                  onClick={() => patchOptions({ confirmDeletion: true })}
                >
                  {t('page.proposal_detail.delete')}
                </Button>
              )}
              {isCommittee && proposal?.status === ProposalStatus.Passed && (
                <Button
                  basic
                  loading={updatingStatus}
                  fluid
                  onClick={() =>
                    patchOptions({
                      confirmStatusUpdate: ProposalStatus.Enacted,
                    })
                  }
                >
                  {t('page.proposal_detail.enact')}
                </Button>
              )}
              {isCommittee && proposal?.status === ProposalStatus.Finished && (
                <>
                  <Button
                    basic
                    loading={updatingStatus}
                    fluid
                    onClick={() => patchOptions({ confirmStatusUpdate: ProposalStatus.Passed })}
                  >
                    {t('page.proposal_detail.pass')}
                  </Button>
                  <Button
                    basic
                    loading={updatingStatus}
                    fluid
                    onClick={() =>
                      patchOptions({
                        confirmStatusUpdate: ProposalStatus.Rejected,
                      })
                    }
                  >
                    {t('page.proposal_detail.reject')}
                  </Button>
                </>
              )}
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </ContentLayout>
      <VotesList
        open={options.showVotesList}
        proposal={proposal}
        votes={votes}
        onClose={() => patchOptions({ showVotesList: false })}
      />
      <VoteRegisteredModal
        loading={subscribing}
        open={options.confirmSubscription}
        onClickAccept={() => subscribe()}
        onClose={() => patchOptions({ confirmSubscription: false })}
      />
      <DeleteProposalModal
        loading={deleting}
        open={options.confirmDeletion}
        onClickAccept={() => deleteProposal()}
        onClose={() => patchOptions({ confirmDeletion: false })}
      />
      <UpdateProposalStatusModal
        open={!!options.confirmStatusUpdate}
        proposal={proposal}
        status={options.confirmStatusUpdate || null}
        loading={updatingStatus}
        onClickAccept={(_, status, vesting_contract, description) =>
          updateProposalStatus(status, vesting_contract, description)
        }
        onClose={() => patchOptions({ confirmStatusUpdate: false })}
      />
      <ProposalSuccessModal
        open={options.showProposalSuccessModal}
        onDismiss={closeProposalSuccessModal}
        onClose={closeProposalSuccessModal}
        proposal={proposal}
        loading={proposalState.loading}
      />
      <UpdateSuccessModal
        open={options.showUpdateSuccessModal}
        onDismiss={closeUpdateSuccessModal}
        onClose={closeUpdateSuccessModal}
        proposalId={proposal?.id}
        updateId={publicUpdates?.[0]?.id}
        loading={proposalState.loading}
      />
    </>
  )
}
