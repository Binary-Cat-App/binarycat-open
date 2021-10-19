#!/bin/bash
network=$1
timeout=$2
while true; do (npx hardhat --network $network bet:update_price) & sleep $timeout; done
