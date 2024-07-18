const { upgradeProxy , deployImplementatoin , verifyImpContract} = require("./utils/upgrade_utils");
let { upgrades } = require("hardhat");

const proxies = [
    {
        name : "TaxicoinUtils",
        address : "0x9220bCe562b773cbc72236B89336205ed86336Fc"
    }
]

const main = async () => {

    for (const element of proxies) {

        // deploy Implementation
        const impAddress = await deployImplementatoin(element.name);

        // upgrade Proxy
        await upgradeProxy(element.address, impAddress);
    }

    for (const element of proxies) {
        // verify imp
        console.log(`Verifying ${element.name} contract...`);
        const impAddress = await upgrades.erc1967.getImplementationAddress(element.address);
        await verifyImpContract(impAddress);
    }
};

main()
  .then(() => {
    console.log("Success");
  })
  .catch((err) => {
    console.log(err);
  });