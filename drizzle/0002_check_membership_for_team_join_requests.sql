-- Custom SQL migration file, put your code below! --

CREATE TRIGGER prevent_request_for_existing_member
BEFORE INSERT ON jam_team_member_requests
WHEN EXISTS (
  SELECT 1
  FROM jam_team_members
  WHERE user_id = NEW.user_id
)
BEGIN
  SELECT RAISE(ABORT, 'User is already a member of a team.');
END;
