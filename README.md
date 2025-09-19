# directus-extension-destroy-session

Endpoint that immediatley removes any sessions for a given user.

## Usage

### POST `/destroy-session`

#### Parameters
- `identifier`: The value identifing the user to remove sessions for. 
- `by`: By which field to find the user. Allowed values are `id`, `email` or `external_identifier`.

## Configuration

### `DESTROY_SESSION_PERMITTED_ROLE`
By default, only admin users have access to this endpoint. Optionally, you can specift a role ID as an env var that is allowed to call the endpoint.

**Note:** the given role must have read access granted for fields `id`, `email` or `external_identifier` for table `directus_users`.