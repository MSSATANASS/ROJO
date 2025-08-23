// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RojoRebelNFT
 * @dev Contrato NFT para los recibos de pago de ROJO Pay
 * Cada NFT representa un pago exitoso y es un coleccionable único
 */
contract RojoRebelNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 0;
    string private _baseTokenURI;
    
    // Mapping para trackear metadata de cada NFT
    mapping(uint256 => PaymentData) public paymentRecords;
    
    struct PaymentData {
        string chargeId;        // ID del charge de Coinbase
        uint256 amount;         // Monto pagado
        string currency;        // Moneda utilizada
        uint256 timestamp;      // Timestamp del pago
        address payer;          // Dirección del pagador
    }
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed to,
        string chargeId,
        uint256 amount,
        string currency
    );
    
    constructor(
        address initialOwner,
        string memory baseURI
    ) ERC721("Red Rebel Receipt", "RRR") Ownable(initialOwner) {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Mint un NFT como recibo de pago
     * Solo el owner (servidor ROJO Pay) puede mintear
     */
    function mintPaymentReceipt(
        address to,
        string memory chargeId,
        uint256 amount,
        string memory currency,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        // Guardar datos del pago
        paymentRecords[tokenId] = PaymentData({
            chargeId: chargeId,
            amount: amount,
            currency: currency,
            timestamp: block.timestamp,
            payer: to
        });
        
        emit NFTMinted(tokenId, to, chargeId, amount, currency);
        
        return tokenId;
    }
    
    /**
     * @dev Mint simple para testing
     */
    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    /**
     * @dev Actualizar base URI para metadata
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Override para devolver el base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Override requerido por Solidity
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Override requerido por Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Obtener total de NFTs minteados
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @dev Obtener datos de pago de un NFT
     */
    function getPaymentData(uint256 tokenId) public view returns (PaymentData memory) {
        require(_ownerOf(tokenId) != address(0), "Token no existe");
        return paymentRecords[tokenId];
    }
}
