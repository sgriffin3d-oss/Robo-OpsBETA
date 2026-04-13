// This runs on Vercel's servers, not the browser.
const API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiMzBlMDJkZjA0NmY4MmI5MmFiNjVmYzhjNWM3NGU0ZDg3ZWI0Y2I3MWIyMjI2NGYxNTNjZDkxMWM5YmVkNDU3NDFmZThiYzBjZjc2ZTJiM2MiLCJpYXQiOjE3NzYxMDU2NDguNDA2NjE0MSwibmJmIjoxNzc2MTA1NjQ4LjQwNjYxNiwiZXhwIjoyNzIyODc2ODQ4LjM5NTEwMiwic3ViIjoiMTU2NDY3Iiwic2NvcGVzIjpbXX0.Fmx86yA_WX47x2a2mE59ad71e6EHLySnbDt3nWa1gNEelHHd_w8ofRc7eLnEgabaouxHSh9kwQYR2Q-aDUTXwA7Csb8hCJVGXgxEOdTq8j3uSZgl4YOikERGRKdHMycVNGs3W2h0Ar1PE9V1LDF3MtoaqJRy66hO3UsfclYRGPGSEaqzppG6tUamAgE6vja8UiGuCcMx_l6wAo7ZQ_6AXuOekXwzdQBjzapPP1Mv0HmRNHAgYc0-R6e2fW57pM4FjhCwjZGFkHVaDxZLu1qk-qLI8dkLgCQVdHHbRubVdUeXK1lGz_UaOw1HcEV1B1cA3FqwbO_0di8kdbmytt4IfjGWx_4-_2MoQYd6Yo7LauSTwXwEmwe1tiaA4BDXUqTf54payjMR53Cywaax3_9Zr-2bcsWyEFrZzWktAAwtfzp8G-KQmMSZVsbfN_3DOD9YibzxG-Xa8lH1GZvnKe7x-v8JSI8YbabCYXEXCP5eaTH98X4lonIgKp5X-PdufdA0SkQVFLhluR2Qcf-gfTNduwrJOBKYJPyoJEhQOUH_GqZ--d23jGJlu0c5lixSfXSBc5jWcbxv-9Bg-7jB6_JpRsAAPhlFiTBmBKzcYVp43060yDvOkO3Pg4ZMJu8XP8GhUN_fhipKvQevQpK6-Vt5YD0k484STCSaUlpBPKaoxns";

export default async function handler(req, res) {
    // Standard CORS headers so your frontend can talk to this backend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Get the path from the URL (e.g., /api?path=/events/123/matches)
    const { path } = req.query;

    if (!path) {
        return res.status(400).json({ error: "No API path provided" });
    }

    try {
        const response = await fetch(`https://www.robotevents.com/api/v2${path}`, {
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Accept": "application/json"
            }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "RobotEvents API unreachable", details: err.message });
    }
}