import React, { useState, useCallback } from 'react'
import styled from 'styled-components'

import { ButtonLight, ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import { Text } from 'rebass'
import { Dots } from '../Pool/styleds'
import Modal from '../../components/Modal'
import PoolCardTriRewardText from '../../components/earn/PoolCardTri/PoolCardTriRewardText'
import { TYPE } from '../../theme'
import TransactionConfirmationModal, {
  ConfirmationModalContent,
  TransactionErrorContent
} from '../../components/TransactionConfirmationModal'
import { RowBetween, RowFixed } from '../../components/Row'
import MultipleCurrencyLogo from '../../components/MultipleCurrencyLogo'

import { useActiveWeb3React } from '../../hooks'
import { usePTriContract } from '../../hooks/useContract'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useFarms } from '../../state/stake/apr'
import { useMasterChefV2Contract } from '../../state/stake/hooks-sushi'
import { usePtriStakeInfo } from '../../hooks/usePtri'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'

import { BIG_INT_ZERO } from '../../constants'
import { STABLESWAP_POOLS } from '../../state/stableswap/constants'
import { DarkGreyCard } from '../../components/Card'

const ButtonsContainer = styled.div`
  margin-top: 20px;
  display: flex;
`

const StyledModalContainer = styled(AutoColumn)`
  padding: 20px;
  width: 100%;
`

const ButtonTextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    font-size: 14px;
  `};
`

const ButtonRewardsContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: 3px;
`

enum ClaimType {
  CLAIM,
  CLAIM_AND_STAKE
}

const twoPool = STABLESWAP_POOLS.USDC_USDT_V2

function ClaimPtri() {
  const { account } = useActiveWeb3React()
  const pTriContract = usePTriContract()
  const addTransaction = useTransactionAdder()
  const stakingContractv2 = useMasterChefV2Contract()
  const { userClaimableRewards, userClaimableRewardsInUsd } = usePtriStakeInfo()
  const { apr, nonTriAPRs, poolId, stakingRewardAddress } = useFarms().filter(farm => farm.ID === 47)[0]
  const [approval, approveCallback] = useApproveCallback(userClaimableRewards, stakingRewardAddress)

  const [pendingTx, setPendingTx] = useState<ClaimType | null>(null)
  const [openModal, setOpenModal] = useState(false)
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>('')
  const [depositTxHash, setDepositTxHash] = useState<string | undefined>('')
  const [claimType, setClaimType] = useState<ClaimType>(ClaimType.CLAIM)
  const [error, setError] = useState<any>(null)
  const [confirmDepositModalOpen, setConfirmDepositModalOpen] = useState(false)

  const hasClaimableRewards = userClaimableRewards?.greaterThan(BIG_INT_ZERO)

  const claim = useCallback(async () => {
    try {
      setPendingTx(ClaimType.CLAIM)
      const tx = await pTriContract?.harvest(account)
      setTxHash(tx.hash)
      addTransaction(tx, { summary: 'Claimed Rewards' })
      return tx
    } catch (error) {
      if ((error as any)?.code === 4001) {
        throw new Error('Transaction rejected.')
      } else {
        console.error(`Claim failed`, error, 'Claim')
        throw new Error(`Claim failed: ${(error as any).message}`)
      }
    }
  }, [account, addTransaction, pTriContract])

  const claimAndStake = useCallback(async () => {
    try {
      setPendingTx(ClaimType.CLAIM)
      const claimTx = await claim()
      claimTx.wait()
      setPendingTx(ClaimType.CLAIM_AND_STAKE)
      setConfirmDepositModalOpen(true)

      const tx = await stakingContractv2?.deposit(poolId, userClaimableRewards.raw.toString(), account)
      setDepositTxHash(tx.hash)
      return addTransaction(tx, { summary: `Deposited rewards into USDC/USDT Farm` })
    } catch (error) {
      if ((error as any)?.code === 4001) {
        throw new Error('Transaction rejected.')
      } else {
        console.error(`Claim and Compound failed`, error, 'Claim and Compound')
        throw new Error(`Claim and Compound failed: ${(error as any).message}`)
      }
    }
  }, [account, addTransaction, claim, poolId, stakingContractv2, userClaimableRewards.raw])

  async function handleClaim() {
    try {
      setClaimType(claimType)
      const claimFn = claimType === ClaimType.CLAIM_AND_STAKE ? claimAndStake : claim
      await claimFn()
    } catch (e) {
      console.error(`Error Claiming: `, e)
      setError(e)
    } finally {
      setPendingTx(null)
    }
  }

  function confirmationHeader() {
    return (
      <AutoColumn justify="center" gap="md">
        <RowFixed marginTop={20}>
          <TYPE.body fontWeight={600} fontSize={36} marginRight={15}>
            {userClaimableRewards?.toSignificant(3)}
          </TYPE.body>
          <MultipleCurrencyLogo currencies={twoPool.poolTokens} size={24} separation={14} />
        </RowFixed>
        <TYPE.body>Claimable rewards</TYPE.body>
      </AutoColumn>
    )
  }

  function modalContent() {
    return error ? (
      <TransactionErrorContent onDismiss={onDismiss} message={error.message} />
    ) : (
      <ConfirmationModalContent
        title={claimType === ClaimType.CLAIM ? 'Claiming rewards' : 'Claiming and Compounding rewards'}
        onDismiss={onDismiss}
        topContent={confirmationHeader}
        bottomContent={() => (
          <AutoColumn>
            {claimType === ClaimType.CLAIM_AND_STAKE && (
              <>
                <RowFixed>
                  <Text fontWeight={500} fontSize={15} marginBottom="10px">
                    Two transactions will be made:
                  </Text>
                </RowFixed>
                <RowFixed>
                  <Text fontWeight={400} fontSize={14} marginBottom="5px">
                    1. Claim pending rewards
                  </Text>
                </RowFixed>
                <RowFixed fontWeight={400} fontSize={14}>
                  <Text>2. Stake rewards into USDC/USDT Farm</Text>
                </RowFixed>
              </>
            )}
            {approval !== ApprovalState.APPROVED && claimType === ClaimType.CLAIM_AND_STAKE ? (
              <ButtonPrimary
                disabled={approval === ApprovalState.UNKNOWN}
                onClick={approveCallback}
                fontSize={16}
                marginTop={20}
              >
                {approval === ApprovalState.UNKNOWN ? (
                  <Dots>Checking Approval</Dots>
                ) : approval === ApprovalState.PENDING ? (
                  <Dots>Approving</Dots>
                ) : (
                  'Approve Depositing rewards'
                )}
              </ButtonPrimary>
            ) : (
              <ButtonPrimary disabled={!!pendingTx} onClick={() => handleClaim()} fontSize={16} marginTop={20}>
                {claimType === ClaimType.CLAIM_AND_STAKE ? 'Claim and Compound' : 'Claim'}
              </ButtonPrimary>
            )}
          </AutoColumn>
        )}
      />
    )
  }

  function onClaim(claimType: ClaimType) {
    setClaimType(claimType)
    setTxHash(undefined)
    setDepositTxHash(undefined)
    setConfirmationModalOpen(true)
    setError(null)
  }

  function onDismiss() {
    setConfirmationModalOpen(false)
    setConfirmDepositModalOpen(false)
    setOpenModal(false)
  }
  return (
    <DarkGreyCard>
      <Modal isOpen={openModal} onDismiss={() => setOpenModal(false)}>
        <StyledModalContainer>
          <Text marginBottom={20}>You can compound your claimed LP tokens to earn the following rewards:</Text>
          <RowBetween>
            <div>
              <Text fontSize={14}>Current USDC/USDT Farm APR:</Text>
            </div>
            <div>
              <PoolCardTriRewardText apr={apr} inStaging={false} nonTriAPRs={nonTriAPRs} />
            </div>
          </RowBetween>

          <ButtonsContainer>
            <ButtonPrimary
              disabled={!hasClaimableRewards || !!pendingTx}
              onClick={() => onClaim(ClaimType.CLAIM_AND_STAKE)}
              marginRight={10}
              fontSize={13}
            >
              {pendingTx === ClaimType.CLAIM_AND_STAKE ? <Dots>Claiming and Compounding</Dots> : 'Claim and Compound'}
            </ButtonPrimary>
            <ButtonPrimary
              disabled={!hasClaimableRewards || !!pendingTx}
              onClick={() => onClaim(ClaimType.CLAIM)}
              fontSize={13}
            >
              {pendingTx === ClaimType.CLAIM ? <Dots>Claiming</Dots> : 'Claim'}
            </ButtonPrimary>
          </ButtonsContainer>
        </StyledModalContainer>
      </Modal>

      <TransactionConfirmationModal
        isOpen={confirmationModalOpen}
        onDismiss={onDismiss}
        attemptingTxn={pendingTx === ClaimType.CLAIM}
        hash={txHash}
        content={modalContent}
        pendingText="Claiming rewards"
      />

      <TransactionConfirmationModal
        isOpen={confirmDepositModalOpen}
        onDismiss={onDismiss}
        attemptingTxn={pendingTx === ClaimType.CLAIM_AND_STAKE}
        hash={depositTxHash}
        content={modalContent}
        pendingText="Staking claimed rewards"
      />

      <TYPE.mediumHeader marginBottom={15} justifySelf="center">
        Claim Protocol Rewards
      </TYPE.mediumHeader>
      <ButtonsContainer>
        {hasClaimableRewards ? (
          <>
            <ButtonLight
              disabled={!hasClaimableRewards}
              onClick={() => onClaim(ClaimType.CLAIM_AND_STAKE)}
              marginRight={20}
            >
              <ButtonTextContainer>
                <div>{pendingTx === ClaimType.CLAIM_AND_STAKE ? <Dots>Claiming</Dots> : 'Claim and Compound '}</div>
                <div>
                  {Number(userClaimableRewardsInUsd) > 0.01 && (
                    <ButtonRewardsContainer>
                      {userClaimableRewards.toFixed(2)}
                      <MultipleCurrencyLogo currencies={twoPool.poolTokens} size={16} />
                    </ButtonRewardsContainer>
                  )}
                </div>
              </ButtonTextContainer>
            </ButtonLight>
            <ButtonLight disabled={!hasClaimableRewards} onClick={() => setOpenModal(true)}>
              <ButtonTextContainer>
                Claim{' '}
                {Number(userClaimableRewardsInUsd) > 0.01 && (
                  <ButtonRewardsContainer>
                    {userClaimableRewards.toFixed(2)}
                    <MultipleCurrencyLogo currencies={twoPool.poolTokens} size={16} />
                  </ButtonRewardsContainer>
                )}
              </ButtonTextContainer>
            </ButtonLight>
          </>
        ) : (
          <ButtonPrimary disabled>You don&apos;t have rewards to claim. Please check back later.</ButtonPrimary>
        )}
      </ButtonsContainer>
    </DarkGreyCard>
  )
}

export default ClaimPtri
