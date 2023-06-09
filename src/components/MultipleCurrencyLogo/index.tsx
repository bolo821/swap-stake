import { Currency } from '@trisolaris/sdk'
import React from 'react'
import styled from 'styled-components'
import CurrencyLogo from '../CurrencyLogo'

const Wrapper = styled.div<{ margin: boolean; sizeraw: number }>`
  position: relative;
  display: flex;
  flex-direction: row;
  margin-right: ${({ sizeraw, margin }) => margin && (sizeraw / 3 + 8).toString() + 'px'};
`

interface MultipleCurrencyLogoProps {
  margin?: boolean
  size?: number
  currencies: Currency[]
  separation?: number
  className?: string
}

const HigherLogo = styled(CurrencyLogo)<{ order: number }>`
  z-index: ${({ order }) => order};
  margin-left: ${({ order }) => (order > 3 ? '0px' : '0px')};
  margin-right: ${({ order }) => (order > 3 ? '35px' : '20px')};
`
const CoveredLogo = styled(CurrencyLogo)<{ sizeraw: number; order: number; position: number }>`
  position: absolute;
  z-index: ${({ order }) => order};
  left: ${({ position }) => `${position}px`};
`

export default function MultipleCurrencyLogo({
  currencies,
  size = 16,
  margin = false,
  separation,
  className
}: MultipleCurrencyLogoProps) {
  const currenciesQty = currencies.length
  const logosSeparation = separation ?? 10

  return (
    <Wrapper sizeraw={size} margin={margin} className={className}>
      {currenciesQty > 2 ? (
        <>
          <HigherLogo currency={currencies[0]} size={size.toString() + 'px'} order={currenciesQty} />
          {currencies.slice(1).map((currency, index) => (
            <CoveredLogo
              key={currency.symbol}
              currency={currency}
              size={size.toString() + 'px'}
              sizeraw={size}
              order={currenciesQty - index - 1}
              position={logosSeparation * (index + 1)}
            />
          ))}
        </>
      ) : (
        <>
          {currencies[0] && <CurrencyLogo currency={currencies[0]} size={size.toString() + 'px'} />}
          {currencies[1] && <CurrencyLogo currency={currencies[1]} size={size.toString() + 'px'} />}
        </>
      )}
    </Wrapper>
  )
}
