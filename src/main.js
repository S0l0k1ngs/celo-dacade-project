import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from 'bignumber.js'
import marketplaceAbi from '../contract/marketplace.abi.json'
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18

const MPContractAddress = "0xa1d626f2D69d165588d4Ca6cd323f8A9A264ecB1"

const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit

let contract

let products = []

function notification(_text) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notify").textContent = _text
}

function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}

const connectCeloWallet = async function () {
    if (window.celo) {
      try {
        notification("⚠️ Please approve this DApp to use it.")
        await window.celo.enable()
        notificationOff()
        const web3 = new Web3(window.celo)
        kit = newKitFromWeb3(web3)
  
        const accounts = await kit.web3.eth.getAccounts()
        kit.defaultAccount = accounts[0]
  
        contract = new kit.web3.eth.Contract(marketplaceAbi, MPContractAddress)
      } catch (error) {
        notification(`⚠️ ${error}.`)
      }
    } else {
      notification("⚠️ Please install the CeloExtensionWallet.")
    }
  }

  async function approve(_price) {
    const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)
  
    const result = await cUSDContract.methods
      .approve(MPContractAddress, _price)
      .send({ from: kit.defaultAccount })
    return result
  }

const getDetails = async function () {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
    document.querySelector("#walletAddress").innerHTML = kit.defaultAccount + `<i class="material-icons right">arrow_drop_down</i>`
    document.querySelector("#walletBalance").textContent =  + cUSDBalance + " " + 'cUSD'
    document.querySelector("#MobileBalance").textContent = cUSDBalance + " " + 'cUSD'
}

const getProducts = async function(){
    const _productsLength = await contract.methods.getTotalAdvisor().call()
    // document.querySelector("#totalAdvisor").textContent = _productsLength
    const _products = []

    for(let i= 0; i<_productsLength; i++) {
      let _product = new Promise(async(resolve, reject)=> {
        let p = await contract.methods.receptionstaff(i).call()
        resolve({
          index: i,
          address: p[0],
          email: p[1],
          image: p[2],
          location: p[3],
          feature: p[4],
          status: p[5],
          duration: new BigNumber(p[6]) / 86400,
          price: new BigNumber(p[7]),
          available: p[8]
        })
      })
      _products.push(_product)
    }
    products = await Promise.all(_products)
    renderProducts()
}

function renderProducts() {
  document
  .getElementById("tripadvisors").innerHTML = ""
  products.forEach((_product) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col s12 m4"
    newDiv.innerHTML = productTemplate(_product)
    document
    .getElementById("tripadvisors").appendChild(newDiv)
  })
}

function productTemplate(_product) {
  if(_product.status == false){
    _product.status = 'Active'
  }
  else{
    _product.status = 'Banned'
  }
  if(_product.available == "0"){
    _product.available = Date.now()
  }
  else{
    _product.available = _product.available
  }
  return `
  <div class="card">
    <div class="card-image">
      <img src="${_product.image}">
        <span class="card-title">
          ${_product.location}
        </span>
          ${identiconTemplate(_product.owner)}
    </div>
    <div class="card-content">
      <p><h5> Features </h5>
      ${_product.feature}<hr>
      </p>
      <p>
      <h5>Days Required </h5>  ${_product.duration} <hr>
      </p>
      <p>
      <h5>Available as from </h5>  ${new Date(_product.available)} <hr>
      </p>
      <p class="badge"> <h5>User Status</h5>
      ${_product.status}
      </p><hr>
      <span><h5> Email </h5>  ${_product.email}
      </span>
    </div>
    <div class="center card-action">
      <a class="white-text teal lighten-1 btn-flat payBtn modal-trigger" data-target="paying" id=${_product.index}>
      Book for ${_product.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
      </a>
    </div>
    <div class="center card-action">
      <a class="white-text red lighten-1 btn-flat report modal-trigger" data-target="reporting" id=${_product.address}>
      Report
      </a>
    </div>
  </div>
  `
}

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <a class="btn-floating halfway-fab" href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions" target="blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  `
}

window.addEventListener('load', async()=> {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getDetails()
    await getProducts()
    notificationOff()
});

document.querySelector('#add_Advisor').addEventListener("click", async(e) => {
  const params = [
    document.getElementById("email").value,
    document.getElementById("imageurl").value,
    document.getElementById("Location").value,
    document.getElementById("feature").value,
    (document.getElementById("duration").value * 86400).toString(),
    new BigNumber(document.getElementById("price").value)
    .shiftedBy(ERC20_DECIMALS)
    .toString()
  ]
  $('.modal').modal('close')
  notification(`⌛ Adding "${kit.defaultAccount}" as a trip advisor`)
  console.log(...params)
    try {
      const result = await contract.methods.addAdvisor(...params).send({ from: kit.defaultAccount })
      console.log('we are trying it now')
    } catch (error) {
      notification(`⚠️ ${error}.⚠️`)
      // console.log('we found error')
      console.log(error)
    }
    notification(`🎉 You successfully added "${params[0]}".`)
    setTimeout(function (){
      notificationOff();
    }, 7000);
    getProducts()
    
})

document.querySelector("#edit_Details").addEventListener(
  "click", async(e) => {
    const editparams = [
      document.getElementById("Edit_email").value,
      document.getElementById("Edit_imageurl").value,
      document.getElementById("Edit_Location").value,
      document.getElementById("Edit_feature").value,
      (document.getElementById("Edit_duration").value * 86400).toString(),
      new BigNumber(document.getElementById("Edit_price").value)
    .shiftedBy(ERC20_DECIMALS)
    .toString()
    ]
    console.log(...editparams)
    $('.modal').modal('close')
    notification(`⌛ Editing Details of "${kit.defaultAccount}"`)
    try{
      const editing = await contract.methods.editDetails(...editparams).send({
        from:kit.defaultAccount
      })
      notification(`🎉 You successfully edited "${params[0]}" details.`)
      setTimeout(function (){
        notificationOff();
      }, 7000);
    }
    catch(error){
      notification(`⚠️ ${error}. ⚠️`)
      console.log(error)
      setTimeout(function (){
        notificationOff();
      }, 7000);
    }  
    getProducts()
  }
)

document.querySelector("#tripadvisors").addEventListener("click", async(e)=>{
  var advisoraddress
  if(e.target.className.includes('report')){
    advisoraddress = e.target.id
  }
  document.querySelector("#sendReport").addEventListener("click", async(b)=>{
    const reportField = [
      document.getElementById("reason").value,
      advisoraddress
    ]
    $('.modal').modal('close')
    notification('⌛ Sending this report, Please wait ⌛')
    try{
      const result = await contract.methods
      .sendComplaint(...reportField)
      .send({from: kit.defaultAccount})
      notification(`🎉 You havbe successfully sent a report`)
      getProducts()
      setTimeout(function (){
        notificationOff();
      }, 4000);
    }
    catch(error){
      notification(`${error}`)
    }
  })
})

document.querySelector("#tripadvisors").addEventListener("click", async(e)=> {
  var ownerID
  if(e.target.className.includes('payBtn')){
    ownerID = e.target.id
  }
  // console.log(ownerAddress) 
  document.querySelector("#payer").addEventListener("click", async(c)=>{
    var timing = document.getElementById("startDate").value
    var epochTime = Date.parse(timing).toString()
    var triperAddress = products[ownerID].address
    const bookingparams = [
      triperAddress.toString(),
      epochTime.toString()
    ]
    console.log(...bookingparams)
    $('.modal').modal('close')
    notification("⌛ Waiting for payment approval ⌛")
    
    try {
      await approve(products[ownerID].price)
      console.log("It works, The payment went through")

      try {
        const reuslt = await contract.methods
        .bookTripWithAdvisor(...bookingparams)
        .send({from: kit.defaultAccount})
        notification(`🎉 You successfully booked "${triperAddress}".`)
        console.log("successful payment")
        getProducts()
        setTimeout(function (){
          notificationOff();
        }, 4000);
      }
      catch(error){
        notification(`⚠️ ${error}.`)
        console.log("error on contract method")
      }

    }
    catch(error){
      notification(`⚠️ ${error}`)
      console.log(error)
    }

    
  })
})
