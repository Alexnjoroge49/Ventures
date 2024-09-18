import abi from '../abis/src/contracts/Genesis.sol/Genesis.json'
import address from '../abis/contractAddress.json'
import { getGlobalState, setGlobalState } from '../store'
import { ethers } from 'ethers'

// Extract Ethereum object from the window, contract address, and ABI
const { ethereum } = window
const contractAddress = address.address
const contractAbi = abi.abi
let tx // Variable to store transactions

// Function to connect to the user's MetaMask wallet
const connectWallet = async () => {
  try {
    // Check if MetaMask is installed
    if (!ethereum) return alert('Please install Metamask')
    
    // Request account access from MetaMask
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    
    // Store the connected account in a global state
    setGlobalState('connectedAccount', accounts[0]?.toLowerCase())
  } catch (error) {
    reportError(error)
  }
}

// Function to check if the wallet is already connected
const isWallectConnected = async () => {
  try {
    // Check if MetaMask is installed
    if (!ethereum) return alert('Please install Metamask')
    
    // Get the list of connected accounts
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    
    // Store the first account in the global state
    setGlobalState('connectedAccount', accounts[0]?.toLowerCase())

    // Handle chain (network) changes
    window.ethereum.on('chainChanged', (chainId) => {
      window.location.reload() // Reload page to reflect changes
    })

    // Handle account changes
    window.ethereum.on('accountsChanged', async () => {
      setGlobalState('connectedAccount', accounts[0]?.toLowerCase())
      await isWallectConnected() // Re-check wallet connection
    })

    // Check if any accounts are found
    if (accounts.length) {
      setGlobalState('connectedAccount', accounts[0]?.toLowerCase())
    } else {
      alert('Please connect wallet.')
      console.log('No accounts found.')
    }
  } catch (error) {
    reportError(error)
  }
}

// Function to get the Ethereum contract instance
const getEtheriumContract = async () => {
  const connectedAccount = getGlobalState('connectedAccount')

  if (connectedAccount) {
    // Initialize a provider and signer for interacting with the blockchain
    const provider = new ethers.providers.Web3Provider(ethereum)
    const signer = provider.getSigner()
    
    // Create a contract instance
    const contract = new ethers.Contract(contractAddress, contractAbi, signer)

    return contract
  } else {
    return getGlobalState('contract')
  }
}

// Function to create a new project on the blockchain
const createProject = async ({
  title,
  description,
  imageURL,
  cost,
  expiresAt,
}) => {
  try {
    if (!ethereum) return alert('Please install Metamask')

    const contract = await getEtheriumContract()
    cost = ethers.utils.parseEther(cost) // Convert cost to Ether units
    tx = await contract.createProject(title, description, imageURL, cost, expiresAt)
    await tx.wait() // Wait for the transaction to be confirmed
    await loadProjects() // Reload the projects to reflect the new one
  } catch (error) {
    reportError(error)
  }
}

// Function to update an existing project on the blockchain
const updateProject = async ({
  id,
  title,
  description,
  imageURL,
  expiresAt,
}) => {
  try {
    if (!ethereum) return alert('Please install Metamask')

    const contract = await getEtheriumContract()
    tx = await contract.updateProject(id, title, description, imageURL, expiresAt)
    await tx.wait() // Wait for the transaction to be confirmed
    await loadProject(id) // Reload the specific project to reflect updates
  } catch (error) {
    reportError(error)
  }
}

// Function to delete a project from the blockchain
const deleteProject = async (id) => {
  try {
    if (!ethereum) return alert('Please install Metamask')
    const contract = await getEtheriumContract()
    await contract.deleteProject(id) // Call the smart contract to delete the project
  } catch (error) {
    reportError(error)
  }
}

// Function to load all projects from the blockchain
const loadProjects = async () => {
  try {
    if (!ethereum) return alert('Please install Metamask')

    const contract = await getEtheriumContract()
    const projects = await contract.getProjects() // Fetch all projects
    const stats = await contract.stats() // Fetch platform statistics

    setGlobalState('stats', structureStats(stats)) // Store stats in the global state
    setGlobalState('projects', structuredProjects(projects)) // Store projects in the global state
  } catch (error) {
    reportError(error)
  }
}

// Function to load a specific project by its ID
const loadProject = async (id) => {
  try {
    if (!ethereum) return alert('Please install Metamask')
    const contract = await getEtheriumContract()
    const project = await contract.getProject(id) // Fetch project details by ID

    setGlobalState('project', structuredProjects([project])[0]) // Store project in the global state
  } catch (error) {
    alert(JSON.stringify(error.message))
    reportError(error)
  }
}

// Function to back (fund) a project on the blockchain
const backProject = async (id, amount) => {
  try {
    if (!ethereum) return alert('Please install Metamask')
    const connectedAccount = getGlobalState('connectedAccount')
    const contract = await getEtheriumContract()
    amount = ethers.utils.parseEther(amount) // Convert amount to Ether units

    tx = await contract.backProject(id, {
      from: connectedAccount,
      value: amount._hex, // Pass the value in hexadecimal format
    })

    await tx.wait() // Wait for the transaction to be confirmed
    await getBackers(id) // Reload backers for the specific project
  } catch (error) {
    reportError(error)
  }
}

// Function to get the backers of a project
const getBackers = async (id) => {
  try {
    if (!ethereum) return alert('Please install Metamask')
    const contract = await getEtheriumContract()
    let backers = await contract.getBackers(id) // Fetch backers of the project

    setGlobalState('backers', structuredBackers(backers)) // Store backers in the global state
  } catch (error) {
    reportError(error)
  }
}

// Function to payout the project owner after funding completion
const payoutProject = async (id) => {
  try {
    if (!ethereum) return alert('Please install Metamask')
    const connectedAccount = getGlobalState('connectedAccount')
    const contract = await getEtheriumContract()

    tx = await contract.payOutProject(id, {
      from: connectedAccount,
    })

    await tx.wait() // Wait for the transaction to be confirmed
    await getBackers(id) // Reload backers for the specific project
  } catch (error) {
    reportError(error)
  }
}

// Helper function to structure backers data
const structuredBackers = (backers) =>
  backers
    .map((backer) => ({
      owner: backer.owner.toLowerCase(), // Convert owner address to lowercase
      refunded: backer.refunded, // Indicate if the backer was refunded
      timestamp: new Date(backer.timestamp.toNumber() * 1000).toJSON(), // Convert timestamp to JSON format
      contribution: parseInt(backer.contribution._hex) / 10 ** 18, // Convert contribution from hex to Ether
    }))
    .reverse() // Reverse the order to show the latest backers first

// Helper function to structure projects data
const structuredProjects = (projects) =>
  projects
    .map((project) => ({
      id: project.id.toNumber(),
      owner: project.owner.toLowerCase(), // Convert owner address to lowercase
      title: project.title,
      description: project.description,
      timestamp: new Date(project.timestamp.toNumber()).getTime(), // Convert timestamp to milliseconds
      expiresAt: new Date(project.expiresAt.toNumber()).getTime(), // Convert expiration date to milliseconds
      date: toDate(project.expiresAt.toNumber() * 1000), // Convert to human-readable date
      imageURL: project.imageURL,
      raised: parseInt(project.raised._hex) / 10 ** 18, // Convert raised amount from hex to Ether
      cost: parseInt(project.cost._hex) / 10 ** 18, // Convert project cost from hex to Ether
      backers: project.backers.toNumber(), // Convert number of backers to integer
      status: project.status, // Project status (e.g., active, completed)
    }))
    .reverse() // Reverse the order to show the latest projects first

// Helper function to format timestamps to human-readable dates
const toDate = (timestamp) => {
  const date = new Date(timestamp)
  const dd = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`
  const mm =
    date.getMonth() + 1 > 9 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`
  const yyyy = date.getFullYear()
  return `${yyyy}-${mm}-${dd}`
}

// Helper function to structure stats data
const structureStats = (stats) => ({
  totalProjects: stats.totalProjects.toNumber(), // Total number of projects
  totalBacking: stats.totalBacking.toNumber(), // Total number of backings
  totalDonations: parseInt(stats.totalDonations._hex) / 10 ** 18, // Total donations in Ether
})

// Helper function to report errors to the console
const reportError = (error) => {
  console.log(error.message)
  throw new Error('No ethereum object.')
}

// Export all functions for use in other parts of the application
export {
  connectWallet,
  isWallectConnected,
  createProject,
  updateProject,
  deleteProject,
  loadProjects,
  loadProject,
  backProject,
  getBackers,
  payoutProject,
}
