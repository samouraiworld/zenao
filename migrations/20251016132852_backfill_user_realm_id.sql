UPDATE users
SET
    realm_id = 'gno.land/r/zenao/users/u' || id
WHERE
    realm_id IS NULL
    OR realm_id = '';