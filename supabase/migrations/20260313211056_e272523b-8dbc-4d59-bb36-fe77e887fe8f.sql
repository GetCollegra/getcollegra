UPDATE college_matches 
SET ai_status = 'failed', 
    ai_error = 'Orphaned pending record. Please retake the quiz for fresh results.' 
WHERE ai_status = 'pending' 
  AND results_version = 1 
  AND jsonb_array_length(college_data) = 0;