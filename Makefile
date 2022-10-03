container = critter-contracts

# Build docker container
.PHONY: build
build:
	docker build . -t $(container)

# Open a CRTTR console (requires a running node)
.PHONY: console
console: build
	docker exec --name $(container) -it $(container) bash -c "npm run console"

# Generate a test coverage report
.PHONY: coverage
coverage: build
	docker run -it --name $(container) --rm $(container) bash -c "npm run coverage"

# Run a local Critter node on the hardhat network
.PHONY: node
node: build
	docker run -it --name $(container) --rm $(container)

# Generate a contract size report
.PHONY: size
size: build
	docker run -it --name $(container) --rm $(container) bash -c "npm run size"

# Run unit tests
.PHONY: test
test: build
	docker run -it --name $(container) --rm $(container) bash -c "npm run test"
