# docker variables
container = smart-contracts
repo = critterfyi
tag = latest
image = $(repo)/$(container):$(tag)

# Build docker image
.PHONY: build
build:
	docker build . -t $(image)

# Open a CRTTR console (requires a running node)
.PHONY: console
console: build
	docker exec -it $(container) bash -c "npm run console"

# Generate a test coverage report
.PHONY: coverage
coverage: build
	docker run --rm $(image) bash -c "npm run coverage"

# Run a local hardhat network node
.PHONY: node
node: build
	docker run -it -p 8545:8545 --name $(container) --rm $(image)

# Generate a contract size report
.PHONY: size
size: build
	docker run -it --rm $(image) bash -c "npm run size"

# Run unit tests
.PHONY: test
test: build
	docker run -it --rm $(image) bash -c "npm run test"
