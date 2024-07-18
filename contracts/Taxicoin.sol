//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract Taxicoin is ERC20PermitUpgradeable {

    address owner;

    function initialize(string memory name, string memory symbol) public initializer {
        __ERC20_init(name, symbol);
        __ERC20Permit_init(name);
        owner = _msgSender();
    }

    function mint(address to, uint256 amount) public {
        require(owner == _msgSender(), "Must be owner to mint");
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
}