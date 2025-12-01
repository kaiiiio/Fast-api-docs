# 🌍 Real World: Parsing Resume Sections

**Scenario**: You are building a Resume Parser.
Resumes have nested sections (Experience -> Job 1 -> Bullets).
Sometimes formatting is messy.

## The Problem: Matching Tags/Indentation
How do we know when "Job 1" ends and "Job 2" begins?

## The Solution: Stack
We push the current "Context" onto a stack.

1.  Encounter "Experience": Push `SECTION:EXPERIENCE`.
2.  Encounter "Software Engineer": Push `JOB`.
3.  Encounter "  - Built API": It's indented. Add to current top of stack (`JOB`).
4.  Encounter "Product Manager" (Same indentation as "Software Engineer"):
    *   Pop `JOB` (Software Engineer is done).
    *   Push `JOB` (Product Manager).

This ensures bullets are attached to the correct Job, and Jobs are attached to the correct Section.
