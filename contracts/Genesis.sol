// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// The Genesis contract defines a decentralized crowdfunding platform
contract Genesis {
    // The owner of the contract, typically the one who deploys it
    address public owner;
    // Tax percentage to be deducted from each project's raised funds
    uint public projectTax;
    // Counter to keep track of the total number of projects
    uint public projectCount;
    // Contract balance to store funds until payout
    uint public balance;
    // Stats structure to hold overall statistics of the platform
    statsStruct public stats;
    // Array to store all projects created
    projectStruct[] projects;

    // Mappings to associate projects and backers with their owners and IDs
    mapping(address => projectStruct[]) projectsOf;
    mapping(uint => backerStruct[]) backersOf;
    mapping(uint => bool) public projectExist;

    // Enum to define different statuses a project can have
    enum statusEnum {
        OPEN,
        APPROVED,
        REVERTED,
        DELETED,
        PAIDOUT
    }

    // Struct to hold platform statistics
    struct statsStruct {
        uint totalProjects;
        uint totalBacking;
        uint totalDonations;
    }

    // Struct to hold information about each backer of a project
    struct backerStruct {
        address owner; // Address of the backer
        uint contribution; // Contribution amount in wei
        uint timestamp; // Time of contribution
        bool refunded; // Whether the backer has been refunded
    }

    // Struct to hold details of each project
    struct projectStruct {
        uint id; // Unique ID for the project
        address owner; // Address of the project creator
        string title; // Title of the project
        string description; // Description of the project
        string imageURL; // Image URL associated with the project
        uint cost; // Funding goal (in wei) required for the project
        uint raised; // Amount raised so far
        uint timestamp; // Timestamp of when the project was created
        uint expiresAt; // Expiry date for the funding period
        uint backers; // Number of backers who contributed
        statusEnum status; // Current status of the project
    }

    // Modifier to restrict access to only the contract owner
    modifier ownerOnly(){
        require(msg.sender == owner, "Owner reserved only");
        _;
    }

    // Event to log actions related to projects
    event Action (
        uint256 id,
        string actionType,
        address indexed executor,
        uint256 timestamp
    );

    // Constructor to initialize the contract with a tax percentage
    constructor(uint _projectTax) {
        owner = msg.sender; // Set contract deployer as the owner
        projectTax = _projectTax; // Set the initial project tax percentage
    }

    // Function to create a new project
    function createProject(
        string memory title,
        string memory description,
        string memory imageURL,
        uint cost,
        uint expiresAt
    ) public returns (bool) {
        // Validations for input data
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(imageURL).length > 0, "ImageURL cannot be empty");
        require(cost > 0 ether, "Cost cannot be zero");

        // Creating a new project struct and initializing it
        projectStruct memory project;
        project.id = projectCount;
        project.owner = msg.sender;
        project.title = title;
        project.description = description;
        project.imageURL = imageURL;
        project.cost = cost;
        project.timestamp = block.timestamp;
        project.expiresAt = expiresAt;

        // Add the new project to the projects array and mappings
        projects.push(project);
        projectExist[projectCount] = true;
        projectsOf[msg.sender].push(project);
        stats.totalProjects += 1;

        // Emit an event indicating a project has been created
        emit Action (
            projectCount++,
            "PROJECT CREATED",
            msg.sender,
            block.timestamp
        );
        return true;
    }

    // Function to update an existing project
    function updateProject(
        uint id,
        string memory title,
        string memory description,
        string memory imageURL,
        uint expiresAt
    ) public returns (bool) {
        // Validations for access rights and input data
        require(msg.sender == projects[id].owner, "Unauthorized Entity");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(imageURL).length > 0, "ImageURL cannot be empty");

        // Updating project details
        projects[id].title = title;
        projects[id].description = description;
        projects[id].imageURL = imageURL;
        projects[id].expiresAt = expiresAt;

        // Emit an event indicating a project has been updated
        emit Action (
            id,
            "PROJECT UPDATED",
            msg.sender,
            block.timestamp
        );

        return true;
    }

    // Function to delete a project
    function deleteProject(uint id) public returns (bool) {
        // Validations for project status and access rights
        require(projects[id].status == statusEnum.OPEN, "Project no longer opened");
        require(msg.sender == projects[id].owner, "Unauthorized Entity");

        // Marking the project as deleted
        projects[id].status = statusEnum.DELETED;
        performRefund(id); // Trigger refunds for backers

        // Emit an event indicating a project has been deleted
        emit Action (
            id,
            "PROJECT DELETED",
            msg.sender,
            block.timestamp
        );

        return true;
    }

    // Internal function to perform refunds to backers of a project
    function performRefund(uint id) internal {
        for(uint i = 0; i < backersOf[id].length; i++) {
            address _owner = backersOf[id][i].owner;
            uint _contribution = backersOf[id][i].contribution;
            
            // Mark the backer as refunded and update timestamp
            backersOf[id][i].refunded = true;
            backersOf[id][i].timestamp = block.timestamp;
            payTo(_owner, _contribution); // Refund the backer

            // Update platform statistics
            stats.totalBacking -= 1;
            stats.totalDonations -= _contribution;
        }
    }

    // Function to back (fund) a project
    function backProject(uint id) public payable returns (bool) {
        // Validations for input data and project status
        require(msg.value > 0 ether, "Ether must be greater than zero");
        require(projectExist[id], "Project not found");
        require(projects[id].status == statusEnum.OPEN, "Project no longer opened");

        // Update statistics and project details with the new contribution
        stats.totalBacking += 1;
        stats.totalDonations += msg.value;
        projects[id].raised += msg.value;
        projects[id].backers += 1;

        // Add backer details to the backers list for the project
        backersOf[id].push(
            backerStruct(
                msg.sender,
                msg.value,
                block.timestamp,
                false
            )
        );

        // Emit an event indicating a project has been backed
        emit Action (
            id,
            "PROJECT BACKED",
            msg.sender,
            block.timestamp
        );

        // Check if the project has reached its funding goal
        if(projects[id].raised >= projects[id].cost) {
            projects[id].status = statusEnum.APPROVED; // Approve the project
            balance += projects[id].raised; // Update contract balance
            performPayout(id); // Pay out to the project owner
            return true;
        }

        // Check if the project funding period has expired
        if(block.timestamp >= projects[id].expiresAt) {
            projects[id].status = statusEnum.REVERTED; // Revert the project
            performRefund(id); // Refund all backers
            return true;
        }

        return true;
    }

    // Internal function to perform payout to the project owner and the contract owner
    function performPayout(uint id) internal {
        uint raised = projects[id].raised;
        uint tax = (raised * projectTax) / 100; // Calculate the tax

        projects[id].status = statusEnum.PAIDOUT; // Update project status to paid out

        payTo(projects[id].owner, (raised - tax)); // Pay the remaining amount to the project owner
        payTo(owner, tax); // Pay the tax to the contract owner

        balance -= projects[id].raised; // Update contract balance

        // Emit an event indicating a project has been paid out
        emit Action (
            id,
            "PROJECT PAID OUT",
            msg.sender,
            block.timestamp
        );
    }

    // Function to request a refund for a project that has been reverted or deleted
    function requestRefund(uint id) public returns (bool) {
        // Validations for project status
        require(
            projects[id].status != statusEnum.REVERTED ||
            projects[id].status != statusEnum.DELETED,
            "Project not marked as revert or delete"
        );
        
        projects[id].status = statusEnum.REVERTED; // Update project status
        performRefund(id); // Perform refunds to all backers
        return true;
    }

    // Function to manually pay out a project by its owner or the contract owner
    function payOutProject(uint id) public returns (bool) {
        // Validations for project status and access rights
        require(projects[id].status == statusEnum.APPROVED, "Project not APPROVED");
        require(
            msg.sender == projects[id].owner ||
            msg.sender == owner,
            "Unauthorized Entity"
        );

        performPayout(id); // Perform payout to the project owner
        return true;
    }

    // Function to change the tax percentage (owner only)
    function changeTax(uint _taxPct) public ownerOnly {
        projectTax = _taxPct;
    }

    // Function to get details of a specific project by ID
    function getProject(uint id) public view returns (projectStruct memory) {
        require(projectExist[id], "Project not found");
        return projects[id];
    }
    
    // Function to get all projects
    function getProjects() public view returns (projectStruct[] memory) {
        return projects;
    }
    
    // Function to get all backers for a specific project by ID
    function getBackers(uint id) public view returns (backerStruct[] memory) {
        return backersOf[id];
    }

    // Internal function to send Ether to a specific address
    function payTo(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}(""); // Transfer the amount
        require(success); // Ensure the transfer was successful
    }
}
