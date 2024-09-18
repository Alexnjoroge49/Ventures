import Identicons from 'react-identicons' // Import Identicons for generating unique icons based on a string
import { useState, useEffect } from 'react' // Import useState and useEffect hooks from React
import { Link } from 'react-router-dom' // Import Link component for navigation
import { truncate, daysRemaining } from '../store' // Import helper functions for truncating text and calculating days remaining
import { FaEthereum } from 'react-icons/fa' // Import Ethereum icon from FontAwesome

// The Projects component displays a list of project cards
const Projects = ({ projects }) => {
  const [end, setEnd] = useState(4) // State to track how many projects to show initially
  const [count] = useState(4) // State to determine how many more projects to load each time
  const [collection, setCollection] = useState([]) // State to hold the currently displayed projects

  // Function to get the current collection of projects to display
  const getCollection = () => projects.slice(0, end)

  // useEffect runs whenever the 'projects' or 'end' state changes
  useEffect(() => {
    setCollection(getCollection()) // Update the collection of projects to display
  }, [projects, end])

  return (
    <div className="flex flex-col px-6 mb-7">
      {/* Container for displaying project cards */}
      <div className="flex justify-center items-center flex-wrap">
        {collection.map((project, i) => (
          <ProjectCard key={i} project={project} /> // Render each project as a ProjectCard component
        ))}
      </div>

      {/* Show the 'Load more' button if there are more projects to display */}
      {projects.length > collection.length ? (
        <div className="flex justify-center items-center my-5">
          <button
            type="button"
            className="inline-block px-6 py-2.5 bg-green-600
          text-white font-medium text-xs leading-tight uppercase
          rounded-full shadow-md hover:bg-green-700"
            onClick={() => setEnd(end + count)} // Increase the 'end' state to load more projects
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  )
}

// The ProjectCard component displays the details of a single project
const ProjectCard = ({ project }) => {
  const expired = new Date().getTime() > Number(project?.expiresAt + '000') // Check if the project has expired based on the current date

  return (
    <div id="projects" className="rounded-lg shadow-lg bg-white w-64 m-4">
      {/* Link to the project's detailed page */}
      <Link to={'/projects/' + project.id}>
        <img
          src={project.imageURL}
          alt={project.title}
          className="rounded-xl h-64 w-full object-cover" // Display the project's image
        />

        <div className="p-4">
          <h5>{truncate(project.title, 25, 0, 28)}</h5> {/* Truncate and display the project title */}

          <div className="flex flex-col">
            <div className="flex justify-start space-x-2 items-center mb-3">
              <Identicons
                className="rounded-full shadow-md"
                string={project.owner}
                size={15}
              /> {/* Generate and display an Identicon based on the project owner's address */}
              <small className="text-gray-700">
                {truncate(project.owner, 4, 4, 11)} {/* Truncate and display the project owner's address */}
              </small>
            </div>

            <small className="text-gray-500">
              {expired ? 'Expired' : daysRemaining(project.expiresAt) + ' left'} {/* Display whether the project is expired or how many days are left */}
            </small>
          </div>

          <div className="w-full bg-gray-300 overflow-hidden">
            <div
              className="bg-green-600 text-xs font-medium
            text-green-100 text-center p-0.5 leading-none
            rounded-l-full"
              style={{ width: `${(project.raised / project.cost) * 100}%` }} // Display a progress bar showing the percentage of funds raised
            ></div>
          </div>

          <div
            className="flex justify-between items-center 
        font-bold mt-1 mb-2 text-gray-700"
          >
            <small>{project.raised} ETH Raised</small> {/* Display the amount of ETH raised */}
            <small className="flex justify-start items-center">
              <FaEthereum />
              <span>{project.cost} ETH</span> {/* Display the project's funding goal in ETH */}
            </small>
          </div>

          <div
            className="flex justify-between items-center flex-wrap
            mt-4 mb-2 text-gray-500 font-bold"
          >
            <small>
              {project.backers} Backer{project.backers == 1 ? '' : 's'} {/* Display the number of backers */}
            </small>
            <div>
              {expired ? (
                <small className="text-red-500">Expired</small> // Display 'Expired' if the project has expired
              ) : project?.status == 0 ? (
                <small className="text-gray-500">Open</small> // Display 'Open' if the project is still active
              ) : project?.status == 1 ? (
                <small className="text-green-500">Accepted</small> // Display 'Accepted' if the project was accepted
              ) : project?.status == 2 ? (
                <small className="text-gray-500">Reverted</small> // Display 'Reverted' if the project was reverted
              ) : project?.status == 3 ? (
                <small className="text-red-500">Deleted</small> // Display 'Deleted' if the project was deleted
              ) : (
                <small className="text-orange-500">Paid</small> // Display 'Paid' if the project was successfully funded
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default Projects // Export the Projects component as the default export
