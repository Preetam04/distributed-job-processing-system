import { JobType } from "./src/types/jobs.types";

console.log("Adding Jobs");

const mpp = { 0: 0, 1: 0, 2: 0, 3: 0 };

async function addJob(jobType: JobType | "UNDEFINED_JOB") {
  const url = "http://localhost:8000/api/v1/jobs";

  const payload = {
    type: jobType,
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
  } catch (error) {
    console.log(error?.message || "Something went wrong");
  }
}

for (let i = 0; i < 25; i++) {
  const random = Math.ceil(Math.random() * 4) - 1;

  const validJob = Object.keys(JobType);

  await addJob(random <= 2 ? validJob[random] : "UNDEFINED_JOB");

  console.log("job added: " + i);

  mpp[`${random}`]++;
}

console.log(mpp);
