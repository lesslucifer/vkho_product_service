import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_expirations')
export class UserExpiration {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;
}
