package mapsl

func MapErr[E any, R any](slice []E, transform func(idx int, elem E) (R, error)) ([]R, error) {
	var err error
	res := make([]R, len(slice))
	for i, e := range slice {
		res[i], err = transform(i, e)
		if err != nil {
			return nil, err
		}
	}
	return res, nil
}

func Map[E any, R any](slice []E, transform func(idx int, elem E) R) []R {
	res := make([]R, len(slice))
	for i, e := range slice {
		res[i] = transform(i, e)
	}
	return res
}

func TryMap[E any, R any](slice []E, transform func(idx int, elem E) (R, error)) ([]R, []error) {
	res := make([]R, len(slice))
	errs := make([]error, len(slice))
	for i, e := range slice {
		res[i], errs[i] = transform(i, e)
	}
	return res, errs
}
