import Recommendations from "@/Pages/AI/Recommendations";

export default function AimatchEmployer({ recommendations, skills, hasError, openJobs, singleJobId }) {
    return (
        <Recommendations
            recommendations={recommendations}
            userType="employer"
            skills={skills}
            hasError={hasError}
            openJobs={openJobs}
            singleJobId={singleJobId}
            pageTitle="AI Match"
            bannerTitle="AI Match: Competence"
            bannerDescription="Our AI evaluates gig worker profiles against your job requirements, focusing on skills match and experience level to find the best candidates. For trust signals (ratings, ID verification), use AI Recommendations."
        />
    );
}
