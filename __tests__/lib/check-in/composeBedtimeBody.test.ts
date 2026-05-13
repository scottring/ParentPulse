import { describe, it, expect } from 'vitest';
import { composeBedtimeBody } from '@/lib/check-in/composeBedtimeBody';

describe('composeBedtimeBody', () => {
  describe('parent-reflection card', () => {
    it('composes both turns with quoted observation', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'parent-reflection',
        parentTurn: {
          userId: 'u1',
          observation: 'You got really quiet after soccer today.',
        },
        kidTurn: {
          response:
            "I was sad because Coach yelled at Mateo and I didn't say anything.",
        },
      });
      expect(body).toContain('[Parent Reflection]');
      expect(body).toContain(
        'Mama: "You got really quiet after soccer today."',
      );
      expect(body).toContain(
        'Liam: "I was sad because Coach yelled at Mateo and I didn\'t say anything."',
      );
    });

    it('omits the kid line when kidTurn is empty', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'parent-reflection',
        parentTurn: { userId: 'u1', observation: 'You hugged the dog twice.' },
        kidTurn: {},
      });
      expect(body).toContain('Mama: "You hugged the dog twice."');
      expect(body).not.toContain('Liam:');
    });

    it('omits the parent line when parentTurn has no observation', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'parent-reflection',
        parentTurn: { userId: 'u1' },
        kidTurn: { response: 'I had a good day.' },
      });
      expect(body).not.toContain('Mama:');
      expect(body).toContain('Liam: "I had a good day."');
    });
  });

  describe('high-low-buffalo card', () => {
    it('composes all six lines when both parent and kid have full answers', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Papa',
        card: 'high-low-buffalo',
        parentTurn: {
          userId: 'u1',
          high: 'walking the dog at sunset',
          low: 'the email from work',
          buffalo: 'a hawk landed on our deck',
        },
        kidTurn: {
          high: 'gym class',
          low: 'spelling test',
          buffalo: 'my pencil broke in half by itself',
        },
      });
      expect(body).toContain('[High / Low / Buffalo]');
      expect(body).toContain('Papa — High: walking the dog at sunset.');
      expect(body).toContain('Low: the email from work.');
      expect(body).toContain('Buffalo: a hawk landed on our deck.');
      expect(body).toContain('Liam — High: gym class.');
      expect(body).toContain('Low: spelling test.');
      expect(body).toContain('Buffalo: my pencil broke in half by itself.');
    });

    it('omits empty slots gracefully', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Papa',
        card: 'high-low-buffalo',
        parentTurn: { userId: 'u1', high: 'walking the dog' },
        kidTurn: { buffalo: 'a weird thing' },
      });
      expect(body).toContain('Papa — High: walking the dog.');
      expect(body).not.toContain('Papa — Low');
      expect(body).not.toContain('Papa — Buffalo');
      expect(body).toContain('Liam — Buffalo: a weird thing.');
      expect(body).not.toContain('Liam — High');
    });

    it('returns a sensible fallback when both turns are completely empty', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Papa',
        card: 'high-low-buffalo',
        parentTurn: { userId: 'u1' },
        kidTurn: {},
      });
      expect(body).toContain('[High / Low / Buffalo]');
      expect(body).toContain('Liam did a bedtime check-in.');
    });
  });

  describe('externalized-worry card', () => {
    it('composes both turns under the Worry Visited header', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'externalized-worry',
        parentTurn: {
          userId: 'u1',
          observation: 'I think Worry visited when you wouldn\'t eat dinner.',
        },
        kidTurn: {
          response:
            'Yeah — Worry kept whispering about the spelling test tomorrow.',
        },
      });
      expect(body).toContain('[Worry Visited]');
      expect(body).toContain(
        'Mama: "I think Worry visited when you wouldn\'t eat dinner."',
      );
      expect(body).toContain(
        'Liam: "Yeah — Worry kept whispering about the spelling test tomorrow."',
      );
    });

    it('omits the kid line when kidTurn is empty', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'externalized-worry',
        parentTurn: { userId: 'u1', observation: 'Worry came at bedtime.' },
        kidTurn: {},
      });
      expect(body).toContain('[Worry Visited]');
      expect(body).toContain('Mama: "Worry came at bedtime."');
      expect(body).not.toContain('Liam:');
    });

    it('returns a fallback when both turns are empty', () => {
      const body = composeBedtimeBody({
        kidName: 'Liam',
        parentName: 'Mama',
        card: 'externalized-worry',
        parentTurn: { userId: 'u1' },
        kidTurn: {},
      });
      expect(body).toContain('[Worry Visited]');
      expect(body).toContain('Liam did a bedtime check-in.');
    });
  });
});
