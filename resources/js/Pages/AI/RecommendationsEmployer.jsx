import Recommendations from "@/Pages/AI/Recommendations";

export default function RecommendationsEmployer({ recommendations, skills, singleJobId, hasError, openJobs }) {
    return (
        <Recommendations
            recommendations={recommendations}
            userType="employer"
            skills={skills}
            hasError={hasError}
            openJobs={openJobs}
            singleJobId={singleJobId}
            pageTitle="AI Recommendations"
            bannerTitle="AI Recommendations: Competence + Trust"
            bannerDescription="Our AI evaluates workers on skills match and trust: ratings from employers, ID verification, and review content (e.g. reliable, good communication) to protect you from unskilled or unreliable workers."
        />
    );
}
