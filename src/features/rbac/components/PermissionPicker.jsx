import { useMemo } from 'react'
import { Box, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material'

export default function PermissionPicker({ permissions, selectedIds, onChange, dense = false }) {
  const modules = useMemo(() => {
    const grouped = permissions.reduce((items, permission) => {
      const moduleName = permission.module || 'OTHER'
      return {
        ...items,
        [moduleName]: [...(items[moduleName] ?? []), permission],
      }
    }, {})

    return Object.entries(grouped)
  }, [permissions])

  const togglePermission = (permissionId) => {
    onChange(
      selectedIds.includes(permissionId)
        ? selectedIds.filter((id) => id !== permissionId)
        : [...selectedIds, permissionId],
    )
  }

  return (
    <Stack className={dense ? 'gap-3' : 'gap-5'}>
      {modules.map(([moduleName, modulePermissions]) => {
        const selectedCount = modulePermissions.filter((permission) =>
          selectedIds.includes(permission.id),
        ).length

        return (
          <Box key={moduleName}>
            <Typography variant="caption" color="text.disabled" fontWeight={700}>
              {moduleName} MODULE · {selectedCount}/{modulePermissions.length}
            </Typography>
            <Box className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
              {modulePermissions.map((permission) => (
                <FormControlLabel
                  key={permission.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedIds.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{permission.name || permission.code}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {permission.code}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
