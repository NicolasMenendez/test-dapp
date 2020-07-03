import MetaMaskOnboarding from '@metamask/onboarding'

const sigUtil = require('eth-sig-util')


const currentUrl = new URL(window.location.href)
const forwarderOrigin = currentUrl.hostname === 'localhost'
  ? 'http://localhost:9010'
  : undefined

const isMetaMaskInstalled = () => {
  const { ethereum } = window
  return Boolean(ethereum && ethereum.isMetaMask)
}

// Dapp Status Section
const accountsDiv = document.getElementById('accounts')

// Basic Actions Section
const onboardButton = document.getElementById('connectButton')

// Encrypt / Decrypt Section
const getEncryptionKeyButton = document.getElementById('getEncryptionKeyButton')
const encryptMessageInput = document.getElementById('encryptMessageInput')
const encryptButton = document.getElementById('encryptButton')
const decryptButton = document.getElementById('decryptButton')
const encryptionKeyDisplay = document.getElementById('encryptionKeyDisplay')
const ciphertextDisplay = document.getElementById('ciphertextDisplay')
const cleartextDisplay = document.getElementById('cleartextDisplay')

const initialize = async () => {

  let onboarding
  try {
    onboarding = new MetaMaskOnboarding({ forwarderOrigin })
  } catch (error) {
    console.error(error)
  }

  let accounts
  let accountButtonsInitialized = false

  const accountButtons = [
    getEncryptionKeyButton,
    encryptButton,
  ]

  const isMetaMaskConnected = () => accounts && accounts.length > 0

  const onClickInstall = () => {
    onboardButton.innerText = 'Onboarding in progress'
    onboardButton.disabled = true
    onboarding.startOnboarding()
  }

  const onClickConnect = async () => {
    try {
      const newAccounts = await ethereum.request({
        method: 'eth_requestAccounts',
      })
      handleNewAccounts(newAccounts)
    } catch (error) {
      console.error(error)
    }
  }

  const clearTextDisplays = () => {
    encryptionKeyDisplay.innerText = ''
    encryptMessageInput.value = ''
    ciphertextDisplay.innerText = ''
    cleartextDisplay.innerText = ''
  }

  const updateButtons = () => {
    const accountButtonsDisabled = !isMetaMaskInstalled() || !isMetaMaskConnected()
    if (accountButtonsDisabled) {
      for (const button of accountButtons) {
        button.disabled = true
      }
      clearTextDisplays()
    } else {
      getEncryptionKeyButton.disabled = false
    }

    if (!isMetaMaskInstalled()) {
      onboardButton.innerText = 'Click here to install MetaMask!'
      onboardButton.onclick = onClickInstall
      onboardButton.disabled = false
    } else if (isMetaMaskConnected()) {
      onboardButton.innerText = 'Connected'
      onboardButton.disabled = true
      if (onboarding) {
        onboarding.stopOnboarding()
      }
    } else {
      onboardButton.innerText = 'Connect'
      onboardButton.onclick = onClickConnect
      onboardButton.disabled = false
    }
  }

  const initializeAccountButtons = () => {

    if (accountButtonsInitialized) {
      return
    }
    accountButtonsInitialized = true

    /**
     * Encrypt / Decrypt
     */

    getEncryptionKeyButton.onclick = async () => {
      try {
        encryptionKeyDisplay.value = await ethereum.request({
          method: 'eth_getEncryptionPublicKey',
          params: [accounts[0]],
        })
      } catch (error) {
        encryptionKeyDisplay.value = `Error: ${error.message}`
        encryptButton.disabled = true
        decryptButton.disabled = true
      }
    }

    encryptMessageInput.onkeyup = () => {
      if (
        !getEncryptionKeyButton.disabled &&
        encryptMessageInput.value.length > 0
      ) {
        if (encryptButton.disabled) {
          encryptButton.disabled = false
        }
      } else if (!encryptButton.disabled) {
        encryptButton.disabled = true
      }
    }

    encryptButton.onclick = () => {
      try {
        ciphertextDisplay.innerText = web3.toHex(JSON.stringify(
          sigUtil.encrypt(
            encryptionKeyDisplay.value,
            { 'data': encryptMessageInput.value },
            'x25519-xsalsa20-poly1305',
          ),
        ))
      } catch (error) {
        ciphertextDisplay.innerText = `Error: ${error.message}`
      }
    }

    decryptButton.onclick = async () => {
      console.log(encryptMessageInput.value)
      try {
        cleartextDisplay.innerText = await ethereum.request({
          method: 'eth_decrypt',
          params: [encryptMessageInput.value, ethereum.selectedAddress],
        })
      } catch (error) {
        cleartextDisplay.innerText = `Error: ${error.message}`
      }
    }
  }

  function handleNewAccounts (newAccounts) {
    accounts = newAccounts
    accountsDiv.innerHTML = accounts
    if (isMetaMaskConnected()) {
      initializeAccountButtons()
    }
    updateButtons()
  }

  updateButtons()

  if (isMetaMaskInstalled()) {

    ethereum.autoRefreshOnNetworkChange = false

    ethereum.on('accountsChanged', handleNewAccounts)

    try {
      const newAccounts = await ethereum.request({
        method: 'eth_accounts',
      })
      handleNewAccounts(newAccounts)
    } catch (err) {
      console.error('Error on init when getting accounts', err)
    }
  }
}

window.addEventListener('DOMContentLoaded', initialize)
