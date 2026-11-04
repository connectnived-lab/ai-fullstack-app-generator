# AI Full Stack App Generator

**One-line pitch:** From a product brief to a runnable Node app, with the plan shown before the files.

## Description

AI Full Stack App Generator takes a business idea or product brief and produces a complete small app: a JSON API with CRUD routes and validation, in-memory storage, a web screen for each entity, and an API test file. The generated project has no dependencies and runs with npm start and npm test on Node 20. Demo mode plans the entities from keywords offline. Live mode lets a model design the entities, and the same validated spec then drives the same generator, so the result is repeatable.

## Tech used

Plain HTML, CSS and ES modules. The generator copies its runtime functions as source text into each project, so the generated app runs the same code that the generator's unit tests cover. A spec validator, a scaffolder, and a bundle writer. Node's test runner for unit tests (including a round-trip run of a generated project) and Playwright for end-to-end checks.

## 30-second demo

1. Click Load sample brief and Generate the app: the plan shows three entities and ten routes. 2. Click src/runtime.js to show the shared validation and routing. 3. Download the bundle. 4. Optionally, unpack it and run npm test in the generated project.

## Resume bullets

- Built a scaffolder that turns a validated app spec into a runnable Node project with API routes, validation, a web UI and generated tests, with no runtime dependencies.
- Designed the generator so the code in each generated app is the same code covered by the generator's unit tests, and checked it by running a generated project's test suite in the unit tests.
- Added an offline planner and an optional model-designed spec behind one validated path, with 37 Node unit tests and Playwright checks at two screen sizes.

## LinkedIn post draft

I built a small full-stack app generator. Describe a product in a sentence or two and it plans the entities, then writes a runnable Node project: an API with validation and CRUD routes, a web screen for each entity, and tests. The generated project has no dependencies and passes its own tests, which the generator checks in its own test suite. Demo mode works offline; a model can design the entities if you connect one. The data lives in memory, so this is a starting point, not a finished product. Code is on GitHub under MIT.
