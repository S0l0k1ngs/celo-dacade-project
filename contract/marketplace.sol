// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract HoneyMoonTripAdvisor {

    address internal admin;

    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;



    struct ReceptionStaff {
        // The address of the owner
        address payable owner;
        // The email of the advisor incases of complaints to resolve issue before step of banning account will take place
        string email;
        // Image of the location 
        string imageLink;
        // The location for the honeymoon trip
        string location;
        // What you will be offering at the stated price
        string features;
        // Used for evaluating if advisor is banned or not
        bool isBanned;
        // The time-length of their stay at the chosen location
        uint duration;
        // The cost of acquiring our service
        uint price; 
        // The end date of his latest booking
        uint availableTime;
        // The amount of times people have complained after using his service
        uint complaint;
    } 


    struct Complaint{
        address booker;
        string complaints;
        address tripadvisor;
    }

    mapping(uint=> Complaint ) public complaint;

    //total complaints
    uint totalComplains = 0;

    // An unsigned integer variable to keep track of how many Advisors we have currently.
    uint internal totalAdvisor = 0;


    //A map function to keep details of previous booking between an advisor and a booker containing start and end date
    // mapping(address => BookingDetails) public bookingDetails;

    // a map function to link the boooker to the trip advisor 
    // will be require before complaints can be accepted
    mapping(address => address) public bookingsLog;

    mapping (uint => ReceptionStaff) public receptionstaff;


    // This will return a true or false associated with an address
    // This will be used by the require function to prevent multiple accounts with one address
    mapping (address=> bool) public isAdvisor;


    // map address to the index with which it was saved so we can find the advisor details from its address easily
    mapping (address=> uint) public advisorLocation;


    // This will keep the end date of the staffs booking based on address
    // This will be combined witth a required function later on as we go
    mapping (address => uint)  public isBooked;




    constructor () {
        admin = (msg.sender);
    }

    modifier onlyAdmin(){
        require(msg.sender == admin, "Only Admin");
        _;
    }


    // A function to add complaints but only if you have booked the trip advisor before
    // We dont want to have just anyone complain without just cause
    function sendComplaint(string memory _reason, address _tripadvisor) public returns(uint) {
        require(bookingsLog[msg.sender] == _tripadvisor, "You do not have an active session with this advisor or have not booked this advisor before");
        complaint[totalComplains] = Complaint(
            msg.sender,
            _reason,
            _tripadvisor
        );
        totalComplains++;
        uint advisorIndex = advisorLocation[_tripadvisor];
    
        uint _advisorComplaint = (receptionstaff[advisorIndex].complaint);

        if(_advisorComplaint >= 2){
            (receptionstaff[advisorIndex].isBanned) = true;
        }
        else{
            receptionstaff[advisorIndex].complaint  = _advisorComplaint + 1;
        }

        return _advisorComplaint;

    } 

    function editDetails(
        string memory _email,
        string memory _imagelink,
        string memory _location,
        string memory _features,
        uint _duration,
        uint _price
    )public {
        require( isAdvisor[msg.sender], "You are not a trip advisor");
        uint advisorArrayIndex = advisorLocation[msg.sender];
        ReceptionStaff storage adviserDet = receptionstaff[advisorArrayIndex];
        adviserDet.email = _email; 
        adviserDet.imageLink = _imagelink; 
        adviserDet.location = _location; 
        adviserDet.features = _features; 
        adviserDet.duration = _duration; 
        adviserDet.price = _price; 
    }




    // A function to add a user as an advisor for honey moon trips
    function addAdvisor(
        string memory _email,
        string memory _imagelink,
        string memory _location,
        string memory _features,
        uint _duration,
        uint _price
    )
    public 
    {
        require(isAdvisor[msg.sender] == false, "This address is already an advisor");
        receptionstaff[totalAdvisor] = ReceptionStaff(
            payable(msg.sender),
            _email,
            _imagelink,
            _location,
            _features,
            false,
            _duration,
            _price,
            0,
            0
        );

        advisorLocation[msg.sender] = totalAdvisor; 

        // Perform incrememnt on total advisor
        // Increase the value of the totalAdvisors we have by 1
        totalAdvisor = totalAdvisor + 1;

        // Set the address to be true to show that it is an advisor
        isAdvisor[msg.sender] = true;

    }

    

    function banAdvisor (
        address _advisorAddress
    ) public  onlyAdmin{
        uint advisorIndex = advisorLocation[_advisorAddress];
        (receptionstaff[advisorIndex].isBanned) = true;
    }


    function removeBan (
        address _advisorAddress
    ) public  onlyAdmin{
        uint advisorIndex = advisorLocation[_advisorAddress];
        (receptionstaff[advisorIndex].isBanned) = false;
    }

    function bookTripWithAdvisor( address _advisorAddress, uint _startDate) public  returns(address booker, address tripAdvisor, uint StartPeriod, uint EndDate){
        uint starter = _startDate;
        require(!isAdvisor[msg.sender], "Advisor can't book");
        require(_startDate > (block.timestamp), "This date has either passed or is too close");
        require((isBooked[_advisorAddress]) < starter, "He is all booked up");
        uint advisorIndexZ = (advisorLocation[_advisorAddress]);
        require(!receptionstaff[advisorIndexZ].isBanned, "This Tripadvisor has been banned from the platform");
        uint advPrice = (receptionstaff[advisorIndexZ].price);
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                _advisorAddress,
                advPrice
            )
        );
        bookingsLog[msg.sender] = _advisorAddress;
        uint advisorIndex = advisorLocation[_advisorAddress];
        uint _duration  = receptionstaff[advisorIndex].duration;
        uint _endDate = _startDate + _duration;
        isBooked[_advisorAddress] = _endDate;
        return (
            (msg.sender),
            _advisorAddress,
            _startDate,
            _endDate
        );

    }

    function getTotalAdvisor() public view returns(uint){
        return(totalAdvisor);
    }

}
