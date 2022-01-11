import { Form } from 'react-bootstrap';
import { Field } from 'react-final-form';
import { WEEKDAYS } from '../../date';

export function WeekdaySelectField({ name, fieldProps = {}, ...props }) {
  return (
    <Form.Group {...props}>
      <Form.Label>Jour de la semaine :</Form.Label>
      <Field
        name={name}
        render={({ input }) => (
          <Form.Select {...input} required {...fieldProps}>
            {WEEKDAYS.map((weekday, id) => (
              <option key={id} value={id}>{weekday}</option>
            ))}
          </Form.Select>
        )}
      />
    </Form.Group>

  );
}