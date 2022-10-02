repo = critterfyi
container = smart-contracts

# Open a CRTTR console (requires a running node)
.PHONY: console
console:
	docker exec -it $(container) bash -c "npm run console"

# Generate a test coverage report
.PHONY: coverage
coverage:
	docker run -it --rm $(repo)/$(container):latest bash -c "npm run coverage"

# Run a local Critter node on the hardhat network
.PHONY: node
node:
	docker run -it --name $(container) --rm $(repo)/$(container):latest

# Generate a contract size report
.PHONY: size
size:
	docker run -it --rm $(repo)/$(container):latest bash -c "npm run size"

# Run unit tests
.PHONY: test
test:
	docker run -it --rm $(repo)/$(container):latest bash -c "npm run test"
