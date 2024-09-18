import { useState } from 'react'  // Import useState hook from React for managing state
import { FaTimes } from 'react-icons/fa'  // Import 'FaTimes' icon from 'react-icons/fa' for the close button
import { toast } from 'react-toastify'  // Import 'toast' for displaying notifications
import { createProject } from '../services/blockchain'  // Import 'createProject' function from the blockchain service
import { useGlobalState, setGlobalState } from '../store'  // Import custom global state hooks

// CreateProject component definition
const CreateProject = () => {
  // Use global state to control modal visibility
  const [createModal] = useGlobalState('createModal')

  // Define state variables for form inputs
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState('')
  const [imageURL, setImageURL] = useState('')

  // Function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')  // Months are zero-based; add 1
    const day = String(today.getDate()).padStart(2, '0')  // Ensure day is two digits
    return `${year}-${month}-${day}`  // Return formatted date string
  }

  // Function to convert date string to a UNIX timestamp in seconds
  const toTimestamp = (dateStr) => {
    const dateObj = Date.parse(dateStr)  // Parse the date string to a Date object
    return dateObj / 1000  // Convert milliseconds to seconds
  }

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()  // Prevent default form submission behavior

    // Ensure all required fields are filled
    if (!title || !description || !cost || !date || !imageURL) return

    // Create parameters object for project creation
    const params = {
      title,
      description,
      cost,
      expiresAt: toTimestamp(date),  // Convert date to timestamp
      imageURL,
    }

    // Call createProject function and show success message
    await createProject(params)
    toast.success('Project created successfully, will reflect in 30sec.')

    // Close modal and reset form
    onClose()
  }

  // Function to close the modal
  const onClose = () => {
    setGlobalState('createModal', 'scale-0')  // Set global state to hide modal
    reset()  // Reset form fields
  }

  // Function to reset form fields
  const reset = () => {
    setTitle('')
    setCost('')
    setDescription('')
    setImageURL('')
    setDate('')
  }

  // Render component UI
  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex
    items-center justify-center bg-black bg-opacity-50
    transform transition-transform duration-300 ${createModal}`}
    >
      <div
        className="bg-white shadow-xl shadow-black
        rounded-xl w-11/12 md:w-2/5 h-7/12 p-6"
      >
        {/* Form to create a new project */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header section with title and close button */}
          <div className="flex justify-between items-center">
            <p className="font-semibold">Add Project</p>
            <button
              onClick={onClose}
              type="button"
              className="border-0 bg-transparent focus:outline-none"
            >
              <FaTimes /> {/* Close icon */}
            </button>
          </div>

          {/* Image preview section */}
          <div className="flex justify-center items-center mt-5">
            <div className="rounded-xl overflow-hidden h-20 w-20">
              <img
                src={
                  imageURL ||
                  'https://media.wired.com/photos/5926e64caf95806129f50fde/master/pass/AnkiHP.jpg'  // Default image URL
                }
                alt="project title"
                className="h-full w-full object-cover cursor-pointer"
              />
            </div>
          </div>

          {/* Input fields for project details */}
          <div className="flex justify-between items-center bg-gray-300 rounded-xl mt-5">
            <input
              className="block w-full bg-transparent border-0 text-sm text-slate-500 focus:outline-none focus:ring-0"
              type="text"
              name="title"
              placeholder="Title"
              onChange={(e) => setTitle(e.target.value)}  // Update state on change
              value={title}
              required
            />
          </div>

          <div className="flex justify-between items-center bg-gray-300 rounded-xl mt-5">
            <input
              className="block w-full bg-transparent border-0 text-sm text-slate-500 focus:outline-none focus:ring-0"
              type="number"
              step={0.01}
              min={0.01}
              name="cost"
              placeholder="cost (ETH)"
              onChange={(e) => setCost(e.target.value)}  // Update state on change
              value={cost}
              required
            />
          </div>

          <div className="flex justify-between items-center bg-gray-300 rounded-xl mt-5">
            <input
              className="block w-full bg-transparent border-0 text-sm text-slate-500 focus:outline-none focus:ring-0"
              type="date"
              name="date"
              placeholder="Expires"
              onChange={(e) => setDate(e.target.value)}  // Update state on change
              value={date}
              min={getTodayDate()}  // Set minimum selectable date to today
              required
            />
          </div>

          <div className="flex justify-between items-center bg-gray-300 rounded-xl mt-5">
            <input
              className="block w-full bg-transparent border-0 text-sm text-slate-500 focus:outline-none focus:ring-0"
              type="url"
              name="imageURL"
              placeholder="Image URL"
              onChange={(e) => setImageURL(e.target.value)}  // Update state on change
              value={imageURL}
              required
            />
          </div>

          <div className="flex justify-between items-center bg-gray-300 rounded-xl mt-5">
            <textarea
              className="block w-full bg-transparent border-0 text-sm text-slate-500 focus:outline-none focus:ring-0"
              type="text"
              name="description"
              placeholder="Description"
              onChange={(e) => setDescription(e.target.value)}  // Update state on change
              value={description}
              required
            ></textarea>
          </div>

          {/* Submit button for the form */}
          <button
            type="submit"
            className="inline-block px-6 py-2.5 bg-green-600 text-white font-medium text-md leading-tight rounded-full shadow-md hover:bg-green-700 mt-5"
          >
            Submit Project
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateProject  // Export the component as default
