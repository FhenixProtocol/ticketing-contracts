import axios from "axios";
import { ethers } from "hardhat";
import hre from "hardhat";

import type { Ticket } from "../../types/Ticket";
import { waitForBlock } from "../../utils/block";

export async function deployTicketFixture(): Promise<{ ticket: Ticket; address: string }> {
  const signers = await ethers.getSigners();
  const admin = signers[0];

  const ticketFactory = await ethers.getContractFactory("Ticket");

  // public key of the localfhenix debug API
  const ticket = await ticketFactory
    .connect(admin)
    .deploy("test", "test", "http://example.com", "0x3108b60c830cff6f1061460bfa6978744b068e82eb0602cceb9b4e7d80df547d");

  const address = await ticket.getAddress();
  return { ticket, address };
}

export async function getTokensFromFaucet() {
  if (hre.network.name === "localfhenix") {
    const signers = await hre.ethers.getSigners();

    if ((await hre.ethers.provider.getBalance(signers[0].address)).toString() === "0") {
      console.log("Balance for signer 0 is 0 - getting tokens from faucet");
      await axios.get(`http://localhost:6000/faucet?address=${signers[0].address}`);
      await waitForBlock(hre);
    }

    if ((await hre.ethers.provider.getBalance(signers[1].address)).toString() === "0") {
      console.log("Balance for signer 1 is 0 - getting tokens from faucet");
      await axios.get(`http://localhost:6000/faucet?address=${signers[1].address}`);
      await waitForBlock(hre);
    }
  }
}
