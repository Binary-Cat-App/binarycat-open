pragma solidity ^0.8.0;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract OracleMock is AggregatorV3Interface {
    constructor() public {}

    /**
     * Returns the latest price
     */
    function latestRoundData()
        public
        view
        override
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        uint256 price = 300000000 +
            (uint256(keccak256(abi.encodePacked(block.timestamp))) %
                100000000) +
            (uint256(keccak256(abi.encodePacked(block.timestamp))) % 3) *
            100000000;
        return (1, int256(price), 1, 1, 1);
    }

    function decimals() external view override returns (uint8) {
        return 0;
    }

    function description() external view override returns (string memory) {
        return "memory";
    }

    function version() external view override returns (uint256) {
        return 0;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, 0, 0, 0, 0);
    }
}
