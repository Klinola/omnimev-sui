// src/utils/tradingUtils.ts

import { HopApi, HopApiOptions } from "@hop.ag/sdk";
import { getFullnodeUrl } from "@mysten/sui/client";
import { div, ONE, lightBlue, green, red } from './utils';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = getFullnodeUrl("mainnet");

const HOP_API_OPTIONS: HopApiOptions = {
  api_key: process.env.HOP_API_KEY || "",
  fee_bps: 0,
  fee_wallet: process.env.FEE_WALLET || "",
};

const HOP_SDK = new HopApi(RPC_URL, HOP_API_OPTIONS);

// Token constants
const SUI_TOKEN = "0x2::sui::SUI";
const USDC_TOKEN = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";

export async function getEachTokenRatio() {
  const tokens = (await HOP_SDK.fetchTokens()).tokens;
  for (const token of tokens) {
    try {
      if (token.coin_type !== SUI_TOKEN) {
        console.log(lightBlue(token.name));
        const result = await performRoundTripQuote(BigInt(ONE), SUI_TOKEN, token.coin_type);
        console.log("Round trip completed, trip ratio:", result.roundTripRatio);
        console.log()
      }
    } catch (error) {
      console.error(red("An error occurred during round trip quote:"), error);
      console.log()
    }
  }
}

export async function performRoundTripQuote(
  amountIn: bigint = BigInt(ONE) * BigInt(10),
  tokenA: string = SUI_TOKEN,
  tokenB: string = USDC_TOKEN
) {
  try {
    const quoteA2B = await HOP_SDK.fetchQuote({
      token_in: tokenA,
      token_out: tokenB,
      amount_in: amountIn,
    });

    console.log(`${tokenA} to ${tokenB} amount out:`, quoteA2B.amount_out_with_fee);

    const quoteB2A = await HOP_SDK.fetchQuote({
      token_in: tokenB,
      token_out: tokenA,
      amount_in: BigInt(quoteA2B.amount_out_with_fee),
    });

    console.log(`${tokenB} to ${tokenA} amount out:`, quoteB2A.amount_out_with_fee);

    const roundTripRatio = div(quoteB2A.amount_out_with_fee, amountIn);
    const profitOrLoss = quoteB2A.amount_out_with_fee - amountIn;

    if (profitOrLoss > 0n) {
      console.log(green("Profit:"), profitOrLoss.toString());
      console.log("Round trip ratio:", green(`${roundTripRatio}`));
      

    } else if (profitOrLoss < 0n) {
      console.log(red("Loss:"), profitOrLoss.toString());
      console.log("Round trip ratio:", red(`${roundTripRatio}`));
    } else {
      console.log(lightBlue("Break even"));
    }

    return {
      quoteA2B,
      quoteB2A,
      roundTripRatio,
      profitOrLoss,
      tokenA,
      tokenB
    };
  } catch (error) {
    throw error;
  }
}
