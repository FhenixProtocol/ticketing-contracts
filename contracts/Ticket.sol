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

    function mintNft(address to, uint tokenId, bytes calldata k1) external returns (uint256) {
        keys[tokenId] = TFHE.asEuint32(k1);

        _mint(to, tokenId);

        return tokenId;
    }

    function getKeyDebug(uint tokenId, bytes32 publicKey) public view returns (bytes memory) {
        return TFHE.reencrypt(keys[tokenId], publicKey);
    }

    function getKey(uint tokenId) public view returns (bytes memory) {
        return TFHE.reencrypt(keys[tokenId], _adminKey);
    }

    function getKeyWithChallenge(uint tokenId, bytes calldata challenge) public view returns (bytes memory) {
        euint32 result = TFHE.xor(keys[tokenId], TFHE.asEuint32(challenge));
        return TFHE.reencrypt(result, _adminKey);
    }
}
