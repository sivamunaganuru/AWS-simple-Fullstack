API_URL=$(aws cloudformation describe-stacks --stack-name YourStackName --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)
echo "REACT_APP_API_URL=${API_URL}" > .env
