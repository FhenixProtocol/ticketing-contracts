// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity >=0.8.13 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "fhevm/lib/TFHE.sol";

contract Ticket is ERC721 {
    string private _baseTokenURI;
    bytes32 private _adminKey;
    euint32 private _privateKey;
    mapping(uint => euint32) internal keys;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        bytes32 adminPublicKey
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
        _adminKey = adminPublicKey;
    }

    function _baseURI() internal view virtual override(ERC721) returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setPrivateKey(bytes calldata k1) external {
        _privateKey = TFHE.asEuint32(k1);
    }

    function mintNft(address to, uint tokenId) external returns (uint256) {
        _mint(to, tokenId);

        return tokenId;
    }

    function getKeyDebug(bytes32 publicKey) public view returns (bytes memory) {
        return TFHE.reencrypt(_privateKey, publicKey);
    }

    function getKey() public view returns (bytes memory) {
        return TFHE.reencrypt(_privateKey, _adminKey);
    }

    // todo: add eip-712 signatures for user validation
    function getKeyWithChallenge(bytes calldata challenge) public view returns (bytes memory) {
        euint32 result = TFHE.xor(_privateKey, TFHE.asEuint32(challenge));
        return TFHE.reencrypt(result, _adminKey);
    }
}
