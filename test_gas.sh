#!/bin/bash

# Function to extract gas used from command output
get_gas_used() {
    local gas=$(echo "$1" | grep "GAS USED:" | awk '{print $3}')
    if [ -z "$gas" ]; then
        echo "ERROR"
    else
        echo "$gas"
    fi
}

# Function to format number with commas
format_number() {
    if [ "$1" = "ERROR" ]; then
        echo "ERROR"
    else
        printf "%d" $1 | sed ':a;s/\B[0-9]\{3\}\>/,&/;ta'
    fi
}

# Function to run a command and get gas used
run_command() {
    local func=$1
    shift
    local args_str=""
    for arg in "$@"; do
        args_str+=" --args \"$arg\""
    done
    local output
    output=$(eval "gnokey maketx call --pkgpath \"gno.land/r/zenao/treescaling\" --func \"$func\" $args_str --gas-fee 50000000ugnot --gas-wanted 500000000 -broadcast -chainid \"dev\" -remote \"tcp://127.0.0.1:26657\" mikaelvallenet" 2>&1)
    get_gas_used "$output"
}

# Arrays to store results
declare -a sizes=(1 10 100 1000)
declare -a init_gas=()
declare -a read_mid_gas=()
declare -a read_random_gas=()
declare -a write_gas=()

echo "Running gas usage tests..."
echo

for size in "${sizes[@]}"; do
    echo "Testing with $(format_number $size) entries..."
    
    # Initialize
    init_result=$(run_command "Initialize" "$size")
    init_gas+=("$init_result")
    
    # Read middle key
    mid=$((size / 2))
    read_mid_result=$(run_command "ReadKey" "key_$mid")
    read_mid_gas+=("$read_mid_result")
    
    # Read random key
    random=$((RANDOM % size))
    read_random_result=$(run_command "ReadKey" "key_$random")
    read_random_gas+=("$read_random_result")
    
    # Write new key
    write_result=$(run_command "WriteKey" "new_key" "new_value")
    write_gas+=("$write_result")
    
    echo "Done."
done

# Generate report
cat << EOF
# AVL Tree Gas Usage Report

## Initialize Operation
| Tree Size    | Gas Used      |
|--------------|---------------|
EOF

for i in "${!sizes[@]}"; do
    if [ "${init_gas[i]}" = "ERROR" ]; then
        printf "| %-11s   | %-13s |\n" "$(format_number ${sizes[i]})" "ERROR"
    else
        printf "| %-11s   | %-13s |\n" "$(format_number ${sizes[i]})" "$(format_number ${init_gas[i]})"
    fi
done

cat << EOF

## Read Middle Key Operation (key_n/2)
| Tree Size    | Gas Used      |
|--------------|---------------|
EOF

for i in "${!sizes[@]}"; do
    if [ "${read_mid_gas[i]}" = "ERROR" ]; then
        printf "| %-11s   | %-13s |\n" "$(format_number ${sizes[i]})" "ERROR"
    else
        printf "| %-11s   | %-13s |\n" "$(format_number ${sizes[i]})" "$(format_number ${read_mid_gas[i]})"
    fi
done

cat << EOF

## Read Random Key Operation
| Tree Size    | Gas Used      | Key Index     |
|--------------|---------------|---------------|
EOF

for i in "${!sizes[@]}"; do
    random=$((RANDOM % sizes[i]))
    if [ "${read_random_gas[i]}" = "ERROR" ]; then
        printf "| %-11s   | %-13s | %-13s |\n" "$(format_number ${sizes[i]})" "ERROR" "$random"
    else
        printf "| %-11s   | %-13s | %-13s |\n" "$(format_number ${sizes[i]})" "$(format_number ${read_random_gas[i]})" "$random"
    fi
done

cat << EOF

## Write Operation (new_key)
| Tree Size    | Gas Used      |
|--------------|---------------|
EOF

for i in "${!sizes[@]}"; do
    if [ "${write_gas[i]}" = "ERROR" ]; then
        printf "| %-11s   | %-13s |\n" "$(format_number ${sizes[i]})" "ERROR"
    else
        printf "| %-11s   | %-13s |\n" "$(format_number ${sizes[i]})" "$(format_number ${write_gas[i]})"
    fi
done