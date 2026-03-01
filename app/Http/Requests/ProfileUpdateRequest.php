<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();
        $isGigWorker = $user->user_type === 'gig_worker';

        $rules = [
            // Basic information - use 'sometimes' to allow partial updates
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($user->id),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            
            // Address fields
            'country' => ['sometimes', 'nullable', 'string', 'max:100', Rule::in(['Philippines'])],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'street_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            
            'profile_photo' => ['sometimes', 'nullable', 'image', 'max:2048'], // 2MB max
            'profile_picture' => ['sometimes', 'nullable', 'image', 'max:5120'], // 5MB max for Cloudinary
        ];

        if ($isGigWorker) {
            // Gig worker-specific fields - use 'sometimes' for partial updates
            $rules = array_merge($rules, [
                'professional_title' => ['sometimes', 'nullable', 'string', 'max:255'],
                'hourly_rate' => ['sometimes', 'nullable', 'numeric', 'min:5', 'max:500'],
                
                // Gig worker onboarding fields (AI matching basis)
                'broad_category' => ['sometimes', 'nullable', 'string', 'max:255'],
                'specific_services' => ['sometimes', 'nullable', 'array'],
                'specific_services.*' => ['string', 'max:255'],
                'skills_with_experience' => ['sometimes', 'nullable', 'array'],
                'working_hours' => ['sometimes', 'nullable', 'array'],
                'timezone' => ['sometimes', 'nullable', 'string', 'max:255'],
                'preferred_communication' => ['sometimes', 'nullable', 'array'],
                'availability_notes' => ['sometimes', 'nullable', 'string', 'max:500'],
                
                // Portfolio fields
                'portfolio_link' => ['sometimes', 'nullable', 'url', 'max:500'],
                'resume_file' => ['sometimes', 'nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'], // 5MB max
            ]);
        } else {
            // Employer-specific fields - use 'sometimes' for partial updates
            $rules = array_merge($rules, [
                'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
                'work_type_needed' => ['sometimes', 'nullable', 'string', 'max:255'],
                'budget_range' => ['sometimes', 'nullable', 'string', 'max:255'],
                'project_intent' => ['sometimes', 'nullable', 'string', 'max:1000'],
                
                // Employer onboarding fields
                'company_size' => ['sometimes', 'nullable', 'in:individual,2-10,11-50,51-200,200+'],
                'industry' => ['sometimes', 'nullable', 'string', 'max:255'],
                'company_website' => ['sometimes', 'nullable', 'url', 'max:255'],
                'company_description' => ['sometimes', 'nullable', 'string', 'max:1000'],
                'primary_hiring_needs' => ['sometimes', 'nullable', 'array'],
                'typical_project_budget' => ['sometimes', 'nullable', 'in:under_500,500-2000,2000-5000,5000-10000,10000+'],
                'typical_project_duration' => ['sometimes', 'nullable', 'in:short_term,medium_term,long_term,ongoing'],
                'preferred_experience_level' => ['sometimes', 'nullable', 'in:any,beginner,intermediate,expert'],
                'hiring_frequency' => ['sometimes', 'nullable', 'in:one_time,occasional,regular,ongoing'],
                'tax_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            ]);
        }

        return $rules;
    }
}
