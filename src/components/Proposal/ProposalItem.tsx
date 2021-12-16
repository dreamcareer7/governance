import React, { useMemo } from 'react'
import { Card } from "decentraland-ui/dist/components/Card/Card"
import { Header } from "decentraland-ui/dist/components/Header/Header"
import { Button } from "decentraland-ui/dist/components/Button/Button"
import { Link } from "gatsby-plugin-intl"
import locations from '../../modules/locations'
import StatusLabel from '../Status/StatusLabel'
import CategoryLabel from '../Category/CategoryLabel'
import { ProposalAttributes } from '../../entities/Proposal/types'

import './ProposalItem.css'
import TokenList from 'decentraland-gatsby/dist/utils/dom/TokenList'
import useAuthContext from 'decentraland-gatsby/dist/context/Auth/useAuthContext'
import FinishLabel from '../Status/FinishLabel'
import LeadingOption from '../Status/LeadingOption'
import useAsyncMemo from 'decentraland-gatsby/dist/hooks/useAsyncMemo'
import { Governance } from '../../api/Governance'
import { calculateResultWinner } from '../../entities/Votes/utils'

export type ProposalItemProps = {
  proposal: ProposalAttributes,
  subscribed?: boolean,
  subscribing?: boolean,
  onSubscribe?: (e: React.MouseEvent<any>, proposal: ProposalAttributes) => void
}

const subscribeIcon = require('../../images/icons/subscribe.svg')
const subscribedIcon = require('../../images/icons/subscribed.svg')

export default function ProposalItem({ proposal, subscribing, subscribed, onSubscribe }: ProposalItemProps) {
  const [ account ] = useAuthContext()
  const [votes] = useAsyncMemo(() => Governance.get().getProposalVotes(proposal!.id), [proposal], { callWithTruthyDeps: true })
  const choices = useMemo((): string[] => proposal?.snapshot_proposal?.choices || [], [ proposal ])
  const winner = useMemo(() => calculateResultWinner(choices, votes || {}), [ choices, votes ])
  function handleSubscription(e: React.MouseEvent<any>) {
    e.stopPropagation()
    e.preventDefault()
    onSubscribe && onSubscribe(e, proposal)
  }
  return <Card as={Link} to={locations.proposal(proposal.id)} style={{ width: '100%' }} className={TokenList.join([
      "ProposalItem",
      subscribed && "ProposalItem--subscribed",
    ])
  }>
      <Card.Content>
        <div className="ProposalItem__Title">
          <Header>{proposal.title}</Header>
          {account && <Button basic onClick={handleSubscription} loading={subscribing} disabled={subscribing}>
            <img src={subscribed ? subscribedIcon : subscribeIcon} width="20" height="20"/>
          </Button>}
          {winner.votes > 0 && <LeadingOption status={proposal.status} leadingOption={winner.choice} metVP={winner.power >= (proposal.required_to_pass || 0)} />}
        </div>
        <div className="ProposalItem__Status">
          <StatusLabel status={proposal.status} />
          <CategoryLabel type={proposal.type} />
          <FinishLabel date={proposal.finish_at} />
        </div>
      </Card.Content>
    </Card>
}
